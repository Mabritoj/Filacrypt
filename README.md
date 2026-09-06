# Filacrypt

**Every spool, tracked to the gram.**

Filacrypt is an NFC-native inventory tracker for 3D-printer filament. Tap a tagged spool to an NFC reader and Filacrypt reads the [OpenPrintTag](https://specs.openprinttag.org/) data straight off the tag — brand, material, color, print temperatures, drying profile, and net weight — then keeps a running tally of what's left as you print. No spreadsheets, no guessing, no vendor lock-in.

> **Status:** Live at [filacrypt.com](https://filacrypt.com) — Cognito auth, a DynamoDB-backed AWS SAM API, CloudFront hosting, and real NFC tag reading (Web NFC) are all deployed. Spool/workspace data is real; usage-event logging and NFC tag writing are still ahead. See [Status & Roadmap](#status--roadmap).

## Why

If you print regularly, you've lost track of what's actually left on a roll, forgotten which colors you own, or started a print only to run out halfway through. Filacrypt exists to answer "what's on my shelf, and how much of it?" without manual bookkeeping — by reading it from the spool itself.

## Features

- **Real NFC scanning** — tap a tagged spool on Chrome for Android to read OpenPrintTag data straight off the tag; falls back to manual entry on browsers without Web NFC support (iOS, desktop, non-Chromium Android)
- **Live remaining weight** — grams, meters, and percentage left on every spool at a glance
- **Low-stock alerts** — get flagged before a roll runs out mid-print
- **Drying reminders** — track which materials need drying, and at what temperature
- **Print settings on hand** — nozzle, bed, chamber, and flow settings read straight from the tag
- **Edit or delete any spool** — correct a detail, adjust remaining weight, or remove a spool entirely, with a confirmation step before anything's deleted
- **Searchable inventory** — filter your whole shelf by brand, material, color, and finish
- **Shared workspaces** — a physical spool is a shared object; invite others (household, makerspace, team) to see and update the same inventory
- **Light & dark themes**
- **Built for the shop floor** — fully responsive down to phone widths, usable from a tablet mounted next to the printer

## Built on an open standard

Filacrypt reads and writes the [OpenPrintTag](https://specs.openprinttag.org/) spec — Prusa's open standard for NFC filament tags. Because it's an open format, Filacrypt isn't tied to one filament brand or one printer vendor: any spool with a compliant NFC tag works.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (strict mode)
- [Vite](https://vite.dev/) for dev/build tooling
- [TanStack Query](https://tanstack.com/query) for server state
- [Zustand](https://zustand-demo.pmnd.rs/) for global client state (theme)
- [React Router](https://reactrouter.com/) for routing
- CSS Modules for styling — no CSS-in-JS, no UI framework
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react) for testing
- [AWS Amplify](https://docs.amplify.aws/) (auth only) for passwordless email-code sign-in and session/token handling

Backend: [AWS SAM](https://docs.aws.amazon.com/serverless-application-model/) (Node.js/TypeScript Lambda), API Gateway HTTP API with a Cognito JWT authorizer, and a single-table DynamoDB design — see [`docs/api.md`](docs/api.md) and [`openapi.yaml`](openapi.yaml) for the full API reference.

Workspace, spool, and usage-event reads now hit the real API. The `website/src/api/mock/` fixtures remain in the tree and are still used by tests (via MSW) as fixture data — they're no longer what the running app fetches from.

## Getting started

Requires [Node.js](https://nodejs.org/) 20+.

This repo has two independent projects: the React frontend in `website/`, and an AWS SAM (Node.js/TypeScript Lambda) backend at the repo root. The frontend talks to a real deployed API — there's no mock-data mode anymore — so it needs a Cognito user pool and API URL to sign in and fetch anything.

```bash
git clone https://github.com/Mabritoj/Filacrypt.git
cd Filacrypt/website
npm install
cp .env.example .env.local
```

Fill in `.env.local` with a deployed backend's values (`VITE_API_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID` — all printed as `sam deploy` outputs, see [Backend](#backend-aws-sam) below). Cognito self-signup is disabled, so your user account has to be created by hand first — no password needed, sign-in is passwordless (email code) end to end:

```bash
aws cognito-idp admin-create-user --user-pool-id <pool-id> --username you@example.com --message-action SUPPRESS
```

Then start the dev server:

```bash
npm run dev
```

It starts on [http://localhost:3000](http://localhost:3000) and binds to your network, so you can also open it from a phone or tablet on the same LAN — handy for testing the shop-floor use case.

### Other commands

All of the commands below run from inside `website/` as well.

| Command             | Description                                 |
| ------------------- | ------------------------------------------- |
| `npm run build`     | Type-check and produce a production build   |
| `npm run test`      | Run the test suite (Vitest)                 |
| `npm run lint`      | Check lint + formatting (ESLint + Prettier) |
| `npm run lint:fix`  | Auto-fix lint/formatting issues             |
| `npm run typecheck` | Type-check only (`tsc --noEmit`)            |

## Backend (AWS SAM)

The backend is a Node.js/TypeScript Lambda API deployed via AWS SAM: Cognito (auth), API Gateway HTTP API with a JWT authorizer, DynamoDB (single-table), and one Lambda per service (`handlers/health/`, `handlers/identity/`, `handlers/workspace/`). Full endpoint reference: [`docs/api.md`](docs/api.md) ([`openapi.yaml`](openapi.yaml) for the machine-readable spec).

All commands below run from the repo root.

```bash
cp samconfig.toml.example samconfig.toml   # fill in your account ID, role ARN, domain, hosted zone ID
npm install                    # root devDependencies (typecheck/test tooling)
npm run typecheck              # tsc --noEmit over handlers/ and layers/common/
npm test                       # Jest, all *.test.ts under handlers/ and layers/common/
sam build                      # bundle every handler with esbuild
sam deploy --config-env dev    # deploy
```

`samconfig.toml` is gitignored (holds real account IDs/ARNs) — copy it from `samconfig.toml.example` and fill in your own values before deploying.

`sam build`/`sam deploy` require the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) and valid AWS credentials; `sam local invoke` additionally requires Docker. See `CLAUDE.md`'s Backend section for Windows-specific notes (esbuild must be installed globally, region/PATH gotchas).

## Screenshots

_Coming soon._

## Project structure

The repo has two independent top-level projects: the React frontend in `website/`, and an AWS SAM backend at the repo root.

```
website/
├── src/
│   ├── api/            # API client, TanStack Query hooks (real fetches against the deployed API)
│   │   ├── mock/        # Fixture data, now used by tests only (via MSW)
│   │   └── types/       # Domain types (Spool, Printer, User, Workspace, OpenPrintTag enums)
│   ├── components/     # Shared, reusable UI components
│   ├── features/       # Feature modules (landing, inventory, filament-detail, scan-spool, account-settings)
│   ├── hooks/          # Shared custom hooks
│   ├── stores/         # Zustand global state
│   └── types/          # Shared TypeScript types
└── ...

handlers/                # AWS Lambda functions (one per service/use-case): health, identity, workspace
layers/common/            # Shared Lambda layer (logger, env-config, workspace-auth)
infrastructure/            # CloudFormation nested stacks (DynamoDB, Cognito, CloudFront, API custom domain)
template.yaml               # AWS SAM root stack
docs/api.md, openapi.yaml     # API reference
```

## Status & roadmap

Filacrypt is live at [filacrypt.com](https://filacrypt.com): sign-in, workspace/spool data, and hosting are all real and deployed. Current focus is usage-event logging and NFC read/write.

- [x] Landing page
- [x] Inventory home (search, filter, low-stock indicators)
- [x] Filament detail (usage history, print settings, inline edit, delete with confirmation)
- [x] Scan spool (real Web NFC tag reading → add to inventory)
- [x] Account settings (profile & workspace preferences)
- [x] AWS backend — Cognito auth, DynamoDB (single-table), API Gateway + Lambda for `health`/`identity`/`workspace` (workspace settings, spool CRUD minus creation-time-only fields, usage-event reads); see [`docs/api.md`](docs/api.md)
- [x] Website hosting — S3 + CloudFront + ACM + Route53, deployed at the apex domain; API on `api.filacrypt.com`
- [ ] Usage-event *creation* (logging a print job against a spool) — reads exist, writes don't yet
- [ ] `Printer` resource (CRUD API) — currently just a free-text field on `Spool`/`Workspace`, no backing endpoints
- [ ] NFC tag *writing* support (currently read-only)

## Contributing

This is currently a solo project and not yet accepting external contributions, but issues and suggestions are welcome.

## License

[MIT](LICENSE)
