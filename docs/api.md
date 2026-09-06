# Filacrypt API

Backend API reference. For the formal machine-readable version (schemas, exact types, importable into Postman/Insomnia/codegen), see [`openapi.yaml`](../openapi.yaml) at the repo root.

- **Base URL:** `https://api.filacrypt.com`
- **Auth:** every route except `/health` requires `Authorization: Bearer <Cognito ID token>`
- **Content type:** `application/json` throughout

## Authentication

There's no username/password on this API — sign-in is passwordless, via Cognito's native email-OTP `USER_AUTH` flow: the frontend calls `signIn()` with the user's email (AWS Amplify), Cognito emails a 6-digit code, and `confirmSignIn()` submits it. The resulting **ID token** (not the access token) is what gets sent as the bearer token; API Gateway's JWT authorizer validates it against the Cognito user pool before a request ever reaches a Lambda, and the token's `sub` claim identifies the caller to every handler — this validation is identical regardless of how the token was issued.

A request with no token, or an invalid/expired one, never reaches application code — API Gateway returns `401` itself.

## Response conventions

**Success:** always a single JSON object with one named top-level key matching the resource — `{ "user": {...} }`, `{ "workspace": {...} }`, `{ "spools": [...] }`. Never a bare array or scalar at the top level, even for list endpoints.

**Error:** always the same envelope, regardless of endpoint or status code:

```json
{ "error": { "code": "NOT_FOUND", "message": "Workspace not found" } }
```

`code` is one of: `VALIDATION_ERROR` (400), `FORBIDDEN` (403), `NOT_FOUND` (404), `USERNAME_TAKEN` (409), `METHOD_NOT_ALLOWED` (405), `INTERNAL_ERROR` (500).

## Authorization model

Every `/workspaces/{workspaceId}/...` route (all of them, eight total) enforces one rule: **the caller must be a member of `{workspaceId}`**, checked once, centrally, before any of that request's actual logic runs. There is no other authorization layer — `workspaceId` is an explicit path parameter (not derived from the token), so this membership check is the only thing preventing one user from reading or writing a workspace they don't belong to. A non-member gets `403 FORBIDDEN`.

`/me` and `/user/setup` have no `workspaceId` — they operate on the caller's own identity (the JWT's `sub`), nothing else.

## Endpoints

### `GET /health`

No auth. Returns `200 { "status": "ok" }`. Used as a deploy/CORS smoke test.

### `GET /me`

Get the signed-in user's profile plus every workspace they belong to.

- **200** → `{ "user": {...}, "workspaceIds": ["..."] }`
- **404** → not an error condition — means the Cognito account exists but hasn't called `POST /user/setup` yet. This is exactly the signal the frontend uses to route a first-time signer-in to the setup form (`RequireProfile`'s guard logic treats it as `null`, not a query error).

### `PATCH /me`

Update the signed-in user's `preferences`. Partial — send only the keys you want to change. This is the only field `/me` supports updating; there's no way to change `name`/`username`/`email` via this API (Profile is read-only in the frontend, and nothing on the backend contradicts that).

Request body:

```json
{ "preferences": { "weightUnit": "kg", "theme": "light" } }
```

Each present preference key is validated against its fixed set of allowed values: `weightUnit` (`g`/`kg`), `temperatureUnit` (`C`/`F`), `lengthUnit` (`m`/`ft`), `theme` (`dark`/`light`), `defaultEntryMode` (`nfc`/`manual`). `currency` is a free-form string (not enum-validated), matching the frontend's open-ended currency toggle.

- **200** → `{ "user": {...} }` (the full, merged profile)
- **400** → a present preference key has a value outside its allowed set, or invalid JSON
- **404** → not an error condition in the schema sense, but shouldn't normally happen for a signed-in caller — means the profile row was deleted (e.g. mid-request account deletion) between token issuance and this request

### `DELETE /me`

Permanently delete the signed-in user's account and everything tied to it. Identity is always derived from the JWT's `sub` claim — never a path parameter or request body field — so this endpoint can only ever delete the caller's own account.

This is a **hard delete**: the Cognito user is removed too (`AdminDeleteUserCommand`), not just the DynamoDB profile — the account can no longer sign in afterward, not merely lose its data.

Cascade behavior per workspace the user belongs to:

- **Sole member** → the entire workspace is deleted: metadata, spools, and every spool's usage events.
- **Member, not owner** → only the user's own membership row is removed; the workspace and its data are untouched.
- **Owner, with other members** → ownership is reassigned to another member first, then the user's membership row is removed. (This path is a data-integrity stopgap for a scenario no current flow can actually produce — there's no working invite/add-member UI yet — not a designed "transfer ownership" experience.)

Deletion runs as a sequence of batched, idempotent deletes rather than one transaction (spool/usage-event counts are unbounded and DynamoDB transactions cap at 100 items) — safely re-invokable if it's interrupted partway through (e.g. a Lambda timeout). The Cognito user is only removed after all DynamoDB cleanup succeeds; if that last step fails, it's logged but still reported as success, since the account's data is irrecoverably gone either way at that point.

- **204** → deleted, no body
- **404** → the profile was already gone (e.g. a retried request after a successful prior delete)
- **500** → unexpected failure during DynamoDB cleanup (Cognito user is untouched in this case — safe to retry)

### `POST /user/setup`

Complete first-time profile setup: creates the user's profile, a personal workspace (owned by them), and the owner membership record, all in one DynamoDB transaction. **Idempotent** — calling it again for an already-provisioned user just returns their existing data with `200`, doesn't error or create a second workspace.

Request body:

```json
{ "name": "Jonathan Mabrito", "username": "jmabrito" }
```

- **200** → already provisioned, existing data returned unchanged
- **201** → newly provisioned
- **400** → `name`/`username` missing, or invalid JSON
- **409** → username already taken (case-insensitive — `JMabrito` collides with `jmabrito`)

### `GET /workspaces/{workspaceId}`

Get workspace metadata and settings.

- **200** → `{ "workspace": {...} }`. `lowStockThresholdG` (default `200`), `defaultDiameterMm` (default `1.75`), and `defaultEmptySpoolWeightG` (default `215`) are defensively backfilled on every read if missing from storage — the response always has all three, even for workspaces provisioned before these fields existed. This is read-time only; nothing is written back.
- **403** → not a member
- **404** → no such workspace

### `PATCH /workspaces/{workspaceId}`

Update workspace settings. Partial — send only the fields you want to change.

Request body (all optional, at least one expected):

```json
{ "lowStockThresholdG": 150, "defaultDiameterMm": 1.75, "defaultEmptySpoolWeightG": 200, "defaultPrinterId": "printer-1" }
```

Any key outside this set of four is silently ignored, not rejected. Each present field's type is validated (`lowStockThresholdG`/`defaultDiameterMm`/`defaultEmptySpoolWeightG` must be numbers, `defaultPrinterId` must be a string) — a type mismatch returns `400` naming the field, and the update never touches storage.

- **200** → `{ "workspace": {...} }` (the full, merged workspace)
- **400** → a present field has the wrong type, or invalid JSON
- **403** → not a member
- **404** → no such workspace

### `GET /workspaces/{workspaceId}/spools`

List every spool in the workspace.

- **200** → `{ "spools": [...] }` (empty array, not a 404, if the workspace has none yet)
- **403** → not a member

### `POST /workspaces/{workspaceId}/spools`

Add a spool. Required fields: `brand`, `materialType`, `materialName`, `status` (non-empty strings), `netWeightG`, `remainingWeightG`, `filamentDiameterMm` (numbers), `tags` (an array). Every other `Spool` field (see [`openapi.yaml`](../openapi.yaml) for the full ~40-field list — print temperatures, drying profile, OpenPrintTag identifiers, NFC tag status, purchase info, etc.) is optional.

`workspaceId` and `addedBy` are **always server-derived** — from the URL path and the caller's JWT `sub`, respectively — even though both are technically part of the shape you'd otherwise send. Any value you put there in the request body is silently discarded, never trusted.

- **201** → `{ "spool": {...} }` (the full created spool, including server-assigned `id`/`createdAt`/`updatedAt`)
- **400** → a required field is missing or the wrong type — `error.message` names which one
- **403** → not a member

### `GET /workspaces/{workspaceId}/spools/{spoolId}`

Get one spool.

- **200** → `{ "spool": {...} }`
- **403** → not a member
- **404** → no spool with this ID *in this specific workspace* (a real spool ID from a different workspace also 404s, not 403 — the workspace-membership check already ran and passed by this point; the spool genuinely isn't found under this `workspaceId`'s partition)

### `PATCH /workspaces/{workspaceId}/spools/{spoolId}`

Update a spool. Partial — send only the fields you want to change.

Every `Spool` field is updatable **except**: `id`, `workspaceId`, `addedBy`, `createdAt`, `updatedAt` (server-controlled), and the nested `tag` object (NFC tag hardware state — only ever written by an actual tag scan/write, never by this endpoint). That includes fields the current frontend UI doesn't expose an editor for (e.g. `netWeightG` is intentionally read-only in the UI, set once at spool entry) — the API itself doesn't restrict it further than the exclusions above.

Each present field is type-checked (numbers must be numbers, strings must be strings, `tags` must be an array) — a mismatch returns `400` naming the field, same pattern as `PATCH /workspaces/{workspaceId}`.

- **200** → `{ "spool": {...} }` (the full, merged spool)
- **400** → a present field has the wrong type, or invalid JSON
- **403** → not a member
- **404** → no spool with this ID in this workspace

### `DELETE /workspaces/{workspaceId}/spools/{spoolId}`

Delete a spool. Immediate and permanent — no soft-delete/undo.

- **204** → deleted, no body
- **403** → not a member
- **404** → no spool with this ID in this workspace

### `GET /workspaces/{workspaceId}/spools/{spoolId}/usage`

List a spool's print-job usage history.

- **200** → `{ "usageEvents": [...] }` (empty array, not a 404, if the spool has no logged usage yet)
- **403** → not a member of the workspace
- **404** → no spool with this ID in this workspace

**Why this endpoint checks the spool's workspace membership explicitly, not just the caller's:** usage events are stored keyed by spool ID alone, not nested under a workspace the way spools themselves are. Without an explicit "does this spool actually belong to `{workspaceId}`" check before querying, a member of workspace A could read workspace B's usage history just by guessing or observing a spool ID that belongs to B. This endpoint always does that check first — a spool that doesn't belong to the given workspace 404s before any usage data is ever queried.

## What's not here yet

- **No usage-event creation.** There's no way to log a new print job's usage via this API yet — `GET .../usage` is read-only. Editing `remainingWeightG` directly via `PATCH .../spools/{spoolId}` is supported and persisted; that's distinct from usage-event logging (a running history of individual print jobs), which still doesn't exist.
- **No `Printer` resource.** `Spool.loadedInPrinterId` and `Workspace.defaultPrinterId` are plain string fields with no corresponding CRUD API or referential validation.
- **No multi-workspace switching UI**, even though the API shape (`workspaceIds: string[]`, explicit `{workspaceId}` in every URL) already supports a user belonging to more than one workspace.
- **No server-side pagination on `GET /workspaces/{workspaceId}/spools`.** The endpoint returns every spool in the workspace, and the frontend paginates, searches, and filters client-side. The underlying DynamoDB query pages correctly (no silent truncation), so this is a payload concern rather than a correctness one — the whole workspace crosses the wire on every inventory load. It becomes a real problem somewhere in the low thousands of spools, at which point the fix is cursor pagination (`?limit=&cursor=`, opaque cursor, `hasMore`) *plus* moving search, filtering, and the stat-tile aggregates server-side, since all three currently depend on the client holding the full list.

## Source of truth

This document and `openapi.yaml` are hand-written against the actual handler code, not generated from it — if they ever drift, the code wins. The backend lives in `handlers/identity/` (health check lives in `handlers/health/`) and `handlers/workspace/`; response/type shapes are defined in `handlers/workspace/{workspace,spools,usage}-lookup.ts` and `handlers/identity/lookup.ts`, and mirrored (hand-matched, not shared — this is two independent TypeScript projects) in `website/src/api/types/`.
