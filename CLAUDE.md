# Project: Filacrypt

React 19 + TypeScript 5.x single-page application (`website/`) backed by an AWS SAM Node.js/TypeScript Lambda backend (repo root). Two independent npm projects in one repo — no shared `package.json`, no npm workspaces.

## Commands

All commands below run from inside `website/` (`cd website` first) — see the Backend (AWS SAM) section at the end of this file for root-level backend commands.

- `npm run dev` — start dev server (port 3000)
- `npm run build` — production build
- `npm run test` — run all tests with Vitest
- `npm run test -- --run src/components/Button.test.tsx` — run a single test file
- `npm run lint` — ESLint + Prettier check
- `npm run lint:fix` — auto-fix lint issues
- `npm run typecheck` — tsc --noEmit

Always run `npm run typecheck && npm run lint` before committing.

## Architecture

- `website/src/components/` — reusable UI components (Button, Modal, Table, etc.)
- `website/src/features/` — feature modules (auth, dashboard, settings), each with its own components, hooks, and API calls
- `website/src/hooks/` — shared custom hooks
- `website/src/api/types/` — domain type modules (`openPrintTag.ts`, `spool.ts`, `user.ts`), re-exported from `index.ts`
- `website/src/api/` — API client, TanStack Query hooks, and mock data (`mock/`) standing in for it until the AWS backend exists
- `website/src/types/` — shared TypeScript types and interfaces
- `website/src/utils/` — pure utility functions
- `website/src/stores/` — Zustand global state (currently: `themeStore`)

New readable entity (e.g. adding `Printer` fetching): add a fixture to `website/src/api/mock/<entity>.ts` (used only by tests — see `website/src/api/mock/spools.ts` / `mockSpools`), then a `use<Entity>()`/`use<Entity>(id)` hook in `website/src/api/<entity>.ts` that calls the real `apiFetch` HTTP client and wraps it in `useQuery` — see `website/src/api/workspace.ts` for the pattern. The mock-fetcher-as-`queryFn` era this line used to describe ended once the AWS backend went live; every `api/*.ts` module now calls `apiFetch` directly. Full rationale in `docs/superpowers/specs/2026-07-08-domain-types-design.md`.

## Component Conventions

- Functional components only — no class components
- Use named exports, not default exports
- Co-locate tests: `Button.tsx` → `Button.test.tsx` in the same directory
- Co-locate styles: `Button.tsx` → `Button.module.css` (CSS Modules)
- Props interface named `{Component}Props` — e.g., `ButtonProps`
- Destructure props in the function signature

```tsx
// Good
export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return <button className={styles[variant]} onClick={onClick}>{label}</button>;
}
```

## State Management

- Local state: useState/useReducer
- Server state: TanStack Query (React Query) — never store API data in local state
- Global app state: Zustand stores in `website/src/stores/`
- No Redux — do not introduce Redux or Redux Toolkit

## Testing

- Use Vitest + React Testing Library
- Test behavior, not implementation — query by role, text, or test ID
- Every component should have at least a smoke test (renders without crashing)
- Mock API calls with MSW (Mock Service Worker), not jest.mock
- Place test utilities in `website/src/test/helpers.ts`

## TypeScript

- Strict mode enabled — do not use `any` unless absolutely necessary with a comment explaining why
- Prefer `interface` over `type` for object shapes
- Use discriminated unions for state machines and complex state
- API response types live in `website/src/api/types/` (re-exported from `index.ts`)

## Responsive Design

- All UI must scale down to phone widths (~320px) — this app is used on tablets/phones (e.g. iPad on the shop floor), not just desktop.
- Breakpoints used across the app: `860px` (collapse multi-column grids to one column, e.g. hero/features/steps) and `640px` (condense nav to logo + primary CTA, scale down large headline/section-title font sizes).
- Any fixed-pixel-width media (SVGs, images) inside a CSS Grid or Flex item must use fluid sizing (`width: 100%; max-width: <intrinsic>px`), not a hard `width: 300px`. A grid/flex item with a fixed-size child won't shrink below that child's size by default, which silently forces horizontal page overflow on narrow viewports — add `min-width: 0` on grid/flex items as a defensive default when they may contain fixed-size or long unbreakable content.
- When verifying UI changes in a browser (see root instructions), check at minimum one phone width (~375px) and iPad portrait (768px) in addition to desktop — the dev server binds to the network (`server.host: true` in `vite.config.ts`) specifically so it can be tested on a real device on the LAN.

## Layout & Theming

- Every page's outer container must render the global `app-container` class (defined in `website/src/index.css`, width from the `--content-max-width` CSS var) alongside its own CSS-module class — e.g. `className={\`app-container ${styles.container}\`}`. Never declare a page-local `max-width` on the container. This is a real-bug fix: Landing, Inventory Home, and Filament Detail were each built from a separate Claude Design mockup and ended up with three different widths (1120/1140/1080px), which made the header visibly shift sideways when navigating between pages.
- Authenticated app pages (everything except `Landing`) use `website/src/components/AppHeader.tsx` for their top bar (brand mark/name + optional `breadcrumb` + optional `actions` + `ProfileMenu`) instead of building their own header — keeps the logo's size and position identical across pages. `Landing` keeps its own marketing nav (different links, logged-out) but matches the same brand-mark sizing.
- **Claude Design mockups are not pixel-consistent with each other** — each screen is generated independently, so container widths, header sizing, and spacing all drift slightly between screens even though they look identical at a glance. When implementing a new page from a mockup, treat its layout chrome (container width, header, spacing) as reference only; use the shared conventions above rather than the mockup's literal values.
- Theme: `useThemeStore` (`website/src/stores/themeStore.ts`) holds `'dark' | 'light'`; `App.tsx` syncs it to `document.documentElement`'s `data-theme` attribute on change. All CSS must read colors via the `var(--color-*)` custom properties defined per-theme in `website/src/index.css` (e.g. `var(--color-surface)`, `var(--color-text-muted)`) — never hardcode a hex color in a CSS module, or it won't respond to the theme toggle.
- `html { scrollbar-gutter: stable }` is intentional — without it, centered content shifts a few px between pages that do/don't have a vertical scrollbar. Don't remove it.

## Workflow

- Always create a todo list for any non-trivial task (multi-step work, a page build, a bug fix touching several files) and keep it updated as you go — mark items complete as soon as they're done, not batched at the end. Makes progress easy to track across a long session.

## Git

- Conventional commits: feat:, docs:, test:
- Branch naming: feature/, bug/
- Feature branches merge locally into `dev` (an integration branch) as each page/feature is completed; `dev` is what eventually goes to `main` via PR
- Always create a PR — never push directly to main

## Do NOT

- Do not use `any` without a justifying comment
- Do not add new dependencies without discussing first
- Do not use inline styles — use CSS Modules
- Do not use default exports

## Backend (AWS SAM)

Node.js/TypeScript Lambda backend, scaffolded per the `aws-sam` skill (`handlers/`, `layers/common/`, `template.yaml`, `samconfig.toml` at the repo root — see the skill's `references/` for full conventions on handler shape, the correlation-ID logger, error responses, and the `template.yaml` review checklist).

### Commands (run from repo root)

- `npm install` — install root devDependencies (shared across `handlers/`/`layers/common/` for typechecking and testing; each handler folder and `layers/common/` also get their own independent `npm install` for their own runtime/build deps)
- `npm run typecheck` — `tsc --noEmit` over `handlers/` and `layers/common/src/`
- `npm test` — Jest, over every `*.test.ts` under `handlers/` and `layers/common/`
- `sam build` — bundles every handler with esbuild and builds `layers/common/` via its `Makefile`
- `sam local invoke <FunctionLogicalId> -e handlers/<service>/<path>/<name>.event.json` — test a function locally against a sample event
- `sam deploy --config-env dev` / `sam deploy --config-env prd` — deploy; `samconfig.toml` is gitignored (holds real account ID/role ARN/domain/hosted-zone-ID) — copy it from `samconfig.toml.example` and fill in your own values first

**Windows/local-build notes:** `esbuild` must be installed globally (`npm install -g esbuild`) for `sam build` to succeed locally — SAM's esbuild builder only installs a function's production dependencies, never devDependencies, so `esbuild` in a handler's own `package.json` isn't enough. If the AWS SAM CLI isn't on `PATH`, invoke it by its full install path (e.g. `C:\Program Files\Amazon\AWSSAMCLI\bin\sam.cmd`). If `sam` commands fail with "AWS Region was not found," set `AWS_DEFAULT_REGION` (e.g. `AWS_DEFAULT_REGION=us-east-1`) or pass `--region` explicitly. `sam local invoke` requires Docker; without it, `sam build` still fully verifies the bundling pipeline.

### Architecture

- `handlers/<service-name>/` — one Lambda per service/use-case (not per action); `index.ts` routes internally by path/method
- `layers/common/src/logger/`, `layers/common/src/config/` — shared Lambda layer: correlation-ID JSON logger and the `requireEnv()`-backed typed config helper, imported by handlers as the `logger`/`env-config` packages
- `tsconfig.json`'s `paths` and `jest.config.cjs`'s `moduleNameMapper` both independently list these layer package names (`logger`, `env-config`), so both need updating together whenever a new shared layer module is added.
- `infrastructure/` — CloudFormation nested stacks for non-SAM-native resources (DynamoDB, Cognito, CloudFront, etc.), wired into `template.yaml`; created on demand — doesn't exist yet
- `template.yaml` — root stack: SAM-native resources only (functions, layers, nested-stack references)

Testing is Jest (not Vitest — that's `website/`'s test runner). AWS SDK calls are mocked with `aws-sdk-client-mock`, never hit against real AWS resources in unit tests.