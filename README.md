# Filacrypt

**Every spool, tracked to the gram.**

If you print regularly, you've lost track of what's actually left on a roll, forgotten which colors you own, or started a print only to run out halfway through. Filacrypt is an NFC-native inventory tracker that fixes that: tap a tagged spool to an NFC reader and it reads the [OpenPrintTag](https://specs.openprinttag.org/) data straight off the tag — brand, material, color, print temperatures, drying profile, and net weight — then keeps a running tally of what's left as you print. No spreadsheets, no guessing, no vendor lock-in.

It's built on OpenPrintTag, Prusa's open standard for NFC filament tags, so it isn't tied to one filament brand or one printer vendor — any spool with a compliant tag works.

## Features

- **Real NFC scanning** — tap a tagged spool on Chrome for Android to read it straight off the tag; falls back to manual entry on browsers without Web NFC support (iOS, desktop, non-Chromium Android)
- **Searchable inventory** — filter your whole shelf by brand, material, color, and finish
- **Shared workspaces** — a physical spool is a shared object; invite others (household, makerspace, team) to see and update the same inventory
- **Built for the shop floor** — fully responsive down to phone widths, so a tablet mounted next to the printer works as well as a desktop

## Getting started

First time deploying this kind of thing? Start with [`docs/deployment.md`](docs/deployment.md) — a full first-time walkthrough that covers creating an AWS account, pointing a domain at Route53, and every step in between. What follows here is the condensed version, for once you've got an AWS account, a domain in Route53, a deploy IAM role, and an S3 deployment bucket already in hand.

Requires [Node.js](https://nodejs.org/) 20+, the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html), and valid AWS credentials.

This repo has two independent projects: an AWS SAM (Node.js/TypeScript Lambda) backend at the repo root, and the React frontend in `website/`. Deploy the backend first — the frontend talks to a real API and needs the Cognito/API URL values `sam deploy` prints out.

```bash
git clone https://github.com/Mabritoj/Filacrypt.git
cd Filacrypt
```

### 1. Backend

```bash
cp samconfig.toml.example samconfig.toml   # fill in your account ID, role ARN, domain, hosted zone ID
npm install                    # root devDependencies (typecheck/test tooling)
sam build                      # bundle every handler with esbuild
sam deploy --config-env dev    # deploy
```

`samconfig.toml` is gitignored (holds real account IDs/ARNs) — copy it from `samconfig.toml.example` and fill in your own values before deploying. `sam local invoke` additionally requires Docker. See `CLAUDE.md`'s Backend section for Windows-specific notes (esbuild must be installed globally, region/PATH gotchas).

Cognito self-signup is disabled, so create your own user by hand — no password needed, sign-in is passwordless (email code) end to end:

```bash
aws cognito-idp admin-create-user --user-pool-id <pool-id> --username you@example.com --message-action SUPPRESS
```

Other backend commands (run from the repo root):

| Command                     | Description                                   |
| ---------------------------- | ---------------------------------------------- |
| `npm run typecheck`          | Type-check `handlers/` and `layers/common/`   |
| `npm test`                   | Run all Jest tests                            |
| `sam deploy --config-env prd`| Deploy to production                          |

### 2. Website

```bash
cd website
npm install
cp .env.example .env.local
```

Fill in `.env.local` with the values `sam deploy` just printed (`VITE_API_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`), then start the dev server:

```bash
npm run dev
```

It starts on [http://localhost:3000](http://localhost:3000) and binds to your network, so you can also open it from a phone or tablet on the same LAN — handy for testing the shop-floor use case.

Other website commands (run from `website/`):

| Command             | Description                                 |
| ------------------- | ------------------------------------------- |
| `npm run build`     | Type-check and produce a production build   |
| `npm run test`      | Run the test suite (Vitest)                 |
| `npm run lint`      | Check lint + formatting (ESLint + Prettier) |
| `npm run lint:fix`  | Auto-fix lint/formatting issues             |
| `npm run typecheck` | Type-check only (`tsc --noEmit`)            |

## Tech stack & project structure

Two independent projects in one repo.

**`website/`** — [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (strict mode), [Vite](https://vite.dev/), [TanStack Query](https://tanstack.com/query) for server state, [Zustand](https://zustand-demo.pmnd.rs/) for global client state, [React Router](https://reactrouter.com/), CSS Modules (no CSS-in-JS, no UI framework), [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react), and [AWS Amplify](https://docs.amplify.aws/) (auth only) for passwordless email-code sign-in and session/token handling.

```
website/src/
├── api/            # API client, TanStack Query hooks (real fetches against the deployed API)
│   ├── mock/        # Fixture data, used by tests only (via MSW)
│   └── types/       # Domain types (Spool, Printer, User, Workspace, OpenPrintTag enums)
├── components/     # Shared, reusable UI components
├── features/       # Feature modules (landing, inventory, filament-detail, scan-spool, account-settings)
├── hooks/          # Shared custom hooks
├── stores/         # Zustand global state
└── types/          # Shared TypeScript types
```

**Backend (repo root)** — [AWS SAM](https://docs.aws.amazon.com/serverless-application-model/) (Node.js/TypeScript Lambda), API Gateway HTTP API with a Cognito JWT authorizer, and a single-table DynamoDB design. Full API reference: [`docs/api.md`](docs/api.md) and [`openapi.yaml`](openapi.yaml).

```
handlers/          # One Lambda per service: health, identity, workspace, chat, cognito-triggers, permission-authorizer
layers/common/     # Shared Lambda layer (logger, env-config, workspace-auth, dynamo-utils)
infrastructure/    # CloudFormation nested stacks (DynamoDB, Cognito, CloudFront, API custom domain, SES)
template.yaml      # AWS SAM root stack
```

## Screenshots

_Coming soon._

## License

[MIT](LICENSE)
