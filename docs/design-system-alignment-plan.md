# Design System Alignment Plan — `website/`

Status: proposal · Date: 2026-10-24 · Scope: `website/src` only (backend untouched)

## 1. Summary

The app has a working theme layer (`--color-*` tokens, `data-theme` toggle) and a handful of shared
components, but everything _below_ color is ad hoc. Each screen was built from a separate Claude
Design mockup, and the drift CLAUDE.md already describes for container widths has also happened to
type, radius, spacing, inputs, cards, labels, icons and menus. Only 7 of ~30 interactive surfaces use
a shared primitive; the rest restyle `<button>`, `<input>` and `<Link>` locally.

The plan below runs in 6 phases, each sized to one PR into `dev`, ordered so every later phase builds
on tokens and primitives that already exist. Phases 0–2 are the foundation; 3–5 migrate features
onto it.

## 2. Findings

All counts below come from `grep` over `website/src` at commit `1cdba85`.

### 2.1 Tokens

| Area            | Current state                                                                                      | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color           | 22 semantic `--color-*` tokens per theme in `index.css`                                            | Good base. But `Landing.module.css` and `Login.module.css` each redefine a private palette (`--brand`, `--ink`, `--muted`, `--muted-2`, `--muted-3`) with hardcoded hex, and the two copies already disagree (`--muted` is `#b8b0a5` on Landing, `#9d968c` on Login). ~60 hex/rgba literals sit in CSS modules, plus SVG hex in `Landing.tsx`, `Login.tsx`, `SpoolVisualization.tsx`. `ProfileMenu.module.css` hardcodes `#8a5227` and `#fff`. |
| Color semantics | `--color-danger` **and** `--color-destructive` both exist                                          | `danger` is used for low-stock warnings, `destructive` for delete. The names don't say that. The `Button` variant is called `danger` but uses `--color-destructive`.                                                                                                                                                                                                                                                                           |
| Typography      | No tokens. `'Hanken Grotesk'` is written out **123** times, `'JetBrains Mono'` 31 times            | 38 distinct weight/size pairs (sizes 9–54px), plus a few `rem` sizes (`0.8rem`, `0.85rem`, `1rem`) in Setup/Members/ErrorMessage. Page `<h1>`s are 26px (Inventory, Scan), 28px (Account, ComingSoon) or 34px (Detail). Field labels are 10px mono (ReviewForm), 11px mono (Account, Login) or 0.85rem sans (Setup, Members).                                                                                                                  |
| Radius          | No tokens. 18 distinct values: 0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 99px, 50% | Cards alone use 12, 13, 14, 16 and 18px.                                                                                                                                                                                                                                                                                                                                                                                                       |
| Spacing         | No tokens. Mix of px and `rem`                                                                     | Card padding varies: `14px 16px`, `15px`, `18px 20px`, `22px`, `24px`, `32px`, `48px 40px`.                                                                                                                                                                                                                                                                                                                                                    |
| Elevation       | 9 different `box-shadow`s, none tokenized                                                          | Popovers alone use `0 18px 44px .38`, `0 18px 44px .3` and `0 20px 48px .4`.                                                                                                                                                                                                                                                                                                                                                                   |
| z-index         | 30, 41, 42, 50, 60, 1000 (twice)                                                                   | No scale. FilterPanel's mobile sheet and Modal both claim 1000.                                                                                                                                                                                                                                                                                                                                                                                |
| Focus           | **Zero** `:focus` / `:focus-visible` rules in the codebase; `outline: none` in 9 places            | Keyboard users get no focus indicator on inputs, and only the browser default elsewhere. This is an accessibility bug, not just a styling gap.                                                                                                                                                                                                                                                                                                 |
| Breakpoints     | `640px` ×14 and `860px` ×4, used consistently; one stray `min-width: 1560px`                       | Fine. CSS custom properties can't be used inside `@media`, so these stay as documented literals (see 3.1).                                                                                                                                                                                                                                                                                                                                     |
| Theme scoping   | Tokens are keyed on `:root[data-theme=…]`                                                          | A subtree can't opt into a theme. That's why `Login.tsx` mutates the **global** Zustand theme on mount and restores it on unmount, and why Landing/Login carry private palettes.                                                                                                                                                                                                                                                               |

### 2.2 Components

What already exists in `components/`: `Button`, `Modal`, `Tabs`, `ErrorMessage`, `LoadingSpool`, `PageShell`,
`AppHeader`, `Breadcrumb`, `ProfileMenu`. What's missing, with the duplicates that would collapse into it:

| Missing primitive                                               | Duplicated today in                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TextInput / Select / Field** (label + control + hint + error) | Six `.input` definitions (Login, AccountSettings, MembersSection, ReviewForm, ChatWidget, Setup) plus `.editInput` (FilamentDetail) and `.unitInput` (AccountSettings). Padding, radius (6/8/9px), background (`bg` vs `surface`), border (`border` vs `border-strong`) and font (13 vs 14px, 500 vs 600) all differ. Four `.fieldLabel` copies, all styled differently. |
| **Card / Surface**                                              | `SettingsCard`, `DetailCard`, `SpoolVisualization .card`, `UsageHistoryTable .card`, `ScanSpool .card/.detectedCard`, `SpoolCard`, `InventoryHome .statTile`, `Setup .card`, `AccountSettings .dangerCard`, Landing `.stepCard/.featureCard`                                                                                                                             |
| **Label / Eyebrow** (mono, uppercase micro-label)               | ~20 classes (`miniStatLabel`, `tagStatLabel`, `specLabel`, `sectionLabel`, `reviewLabel`, `pctLabel`, `eyebrow`, ToggleGroup `.label`, …) at 9, 10 or 11px. The uppercase is typed into the JSX (`"NET WEIGHT"`, `"PRINT SETTINGS"`, `label="WEIGHT UNIT"`; 22 occurrences) instead of applied with `text-transform`, so screen readers may read them letter by letter.  |
| **Stat** (label + value [+ unit])                               | Inventory stat tiles, Detail mini-stats, NFC tag stats, SpoolVisualization stats, Landing spool stats                                                                                                                                                                                                                                                                    |
| **Badge / Chip**                                                | `SpoolCard .materialBadge/.lowBadge`, Detail `.badge/.healthBadge`, `AccountSettings .verifiedBadge`, `FilterPanel .chip` (a toggle), `InventoryHome .filterCount`                                                                                                                                                                                                       |
| **IconButton**                                                  | Detail `⋮` options button, chat close `×`, ProfileMenu settings and switch-workspace buttons, Breadcrumb mobile back                                                                                                                                                                                                                                                     |
| **Menu / Popover**                                              | `ProfileMenu` panel and Detail options menu are both `role="menu"` with **no arrow-key navigation**. FilterPanel is a third popover. All share `useDismissablePanel`, but each has its own panel styles, shadow and z-index.                                                                                                                                             |
| **Switch**                                                      | `ProfileMenu .switch` (only copy, but it's a generic control living inside a feature-specific component)                                                                                                                                                                                                                                                                 |
| **SegmentedControl**                                            | `features/account-settings/ToggleGroup`: generic and well-typed (`<T extends string>`), but lives in a feature folder                                                                                                                                                                                                                                                    |
| **ProgressBar / Meter**                                         | `SpoolCard` progress track, Detail NFC memory track; both set `width` with inline `style`                                                                                                                                                                                                                                                                                |
| **Pagination**                                                  | `InventoryHome` (inline)                                                                                                                                                                                                                                                                                                                                                 |
| **BrandMark**                                                   | 4 copies: `AppHeader`, `Login`, Landing nav, Landing footer                                                                                                                                                                                                                                                                                                              |
| **Icons**                                                       | NFC-waves SVG ×3 (Scan reader, Scan "Switch to NFC", Detail tag band). Spinning-spool SVG ×2 (`LoadingSpool`, `ChatWidget`). Full spool illustration ×3 (`Landing`, `Login`, `SpoolVisualization`), with hardcoded gradient ids (`lflange`, `loginSpoolFlange`) that collide if two ever render on one page. Gear and swap icons inline in `ProfileMenu`.                |
| **Formatters**                                                  | `formatTag` ×5, `formatDate` ×2, `formatStatus` ×1 (identical to `formatTag`)                                                                                                                                                                                                                                                                                            |

Defects in the components that do exist:

- **`Modal`**: destructures `onCancel` but never calls it, so Escape and backdrop clicks do nothing.
  _Correction (Phase 3): that part is deliberate, not a bug. Tests pin it, including
  "shows a delete confirmation dialog that is not dismissed by clicking outside"._ The real gaps:
  focus isn't moved into the dialog, kept there, or restored on close. `aria-labelledby="modal-title"` is
  a hardcoded id. It isn't portaled, so its stacking depends on where it's rendered. Every caller
  re-implements the footer (`.modalActions` ×4 with `gap: 10px` vs `0.6rem`, `margin-top: 18px` vs `1rem`).
  Callers also disagree on whether Cancel is `ghost` or `secondary`.
- **`Button`**: no `size` (Detail header and Scan banner need compact buttons and fake it with
  `className`). No loading state: every caller hand-rolls `{isPending ? 'Saving…' : 'Save'}` plus
  `disabled`. The four variants copy the same 12-line base block four times. `ghost` has no
  `display:inline-flex`/`gap`, so `icon` misaligns on it.
- **`Tabs`**: no roving `tabIndex` or arrow keys, no `aria-controls`/`tabpanel` wiring.
- **`ErrorMessage`**: no `role="alert"`, so errors appear without being announced.
- **`SpoolCard`** is a `<button>` that navigates. It should be a link (middle-click, open in new tab,
  correct semantics), and `<div>`s inside a `<button>` are invalid HTML (buttons only allow phrasing content).
- **`SpoolVisualization`** reads `useThemeStore` in JS to choose SVG metal colors. That should be CSS tokens.

### 2.3 Polymorphism

There's none today, and that's what causes the "Link styled as a button" copies. Raw elements styled
as buttons: `Landing .btnPrimary/.btnSecondary/.navCta/.navSignIn`, `ScanSpool .viewInventoryButton
/.scanAnotherButton/.manualLink`, `FilterPanel .apply/.reset`, `Login .resendButton/.backLink`,
`ChatWidget .send`, `InventoryHome .filterButton/.pageButton`, `FilamentDetail .backLink`. There are 27
raw `<button>`s outside `Button.tsx`, each with its own class.

Recommended approach (details in 3.3):

- **`Button`**: a discriminated union on the navigation target (`to` → router `Link`, `href` → `<a>`,
  neither → `<button>`). These are behaviorally different elements with different required props, so a
  union types them better than a generic `as`. This matches the CLAUDE.md rule to use discriminated
  unions for complex prop shapes.
- **`Card`, `Text`/`Label`, `Stack`**: a constrained generic `as` prop. Here only the tag changes
  (`section`/`article`/`li`/`Link`, or `span`/`div`/`legend`/`dt`), and the props are a pass-through.
- React 19 makes refs a normal prop, so the polymorphic helper needs no `forwardRef`.

### 2.4 Adjacent issues (not design-system, but noticed)

- `RequireAuth` and `RequireProfile` both contain the same `fetchAuthSession` effect. Extract a
  `useAuthSession()` hook.
- `useDismissablePanel` listens for `mousedown`. `pointerdown` is the better event for touch on iPad.
  _(Done in Phase 3.)_
- Baseline was **not green** (fixed in Phase 0). `client.test.ts` and `members.test.tsx` used `test`/`expect`
  without importing them, so `tsc` failed. 6 tests depended on `VITE_API_URL`/`VITE_CHAT_URL` from a
  developer's local `.env`, which fresh clones and CI don't have. Vitest now pins both values in `vite.config.ts`.

## 3. Target architecture

### 3.1 Tokens: `src/styles/tokens.css` (imported by `index.css`)

Keep the current two-tier shape: theme-specific **semantic** colors, plus theme-independent **scales**.
A three-tier primitive/semantic/component token system would be overkill for an app this size.

```css
:root {
  /* type */
  --font-sans: "Hanken Grotesk", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --text-2xs: 10px; /* micro labels (absorbs 9px) */
  --text-xs: 11px; /* eyebrows, badges, field labels */
  --text-sm: 12px; /* meta, secondary */
  --text-md: 13px; /* default UI text, buttons */
  --text-base: 14px; /* body, inputs */
  --text-lg: 15px; /* card titles, brand name */
  --text-xl: 17px; /* modal title (absorbs 16) */
  --text-2xl: 20px; /* stat values, section heads (absorbs 18/19) */
  --text-3xl: 24px; /* absorbs 22 */
  --text-4xl: 28px; /* page h1 — one size everywhere (absorbs 26) */
  --text-display-1: 32px; /* detail hero, absorbs 30/34 */
  --text-display-2: 40px; /* absorbs 38/42 */
  --text-display-3: 54px; /* landing hero only */
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
  --weight-black: 800;
  --tracking-label: 0.05em;

  /* space: 4px base */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* radius (mapping: 5–7→sm, 8–10→md, 11–14→lg, 16–18→xl, 20–24→2xl, 99px/50%→full) */
  --radius-sm: 6px;
  --radius-md: 9px;
  --radius-lg: 13px;
  --radius-xl: 16px;
  --radius-2xl: 22px;
  --radius-full: 9999px;

  /* elevation, layering, motion */
  --shadow-popover: 0 18px 44px rgb(0 0 0 / 0.36);
  --shadow-modal: 0 30px 70px rgb(0 0 0 / 0.4);
  --shadow-hero: 0 40px 90px rgb(0 0 0 / 0.45);
  --z-popover: 50;
  --z-floating: 40;
  --z-modal: 1000; /* modal moot once <dialog> uses top layer */
  --duration-fast: 120ms;
  --duration-base: 180ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  /* breakpoints can't be vars in @media — documented only: 640px (sm), 860px (md) */
}

:root,
[data-theme="dark"] {
  color-scheme: dark; /* …existing --color-* … */
}
[data-theme="light"] {
  color-scheme: light; /* … */
}
```

Changes to the color set:

1. **Scope themes to any element**: change `:root[data-theme=…]` to `[data-theme=…]`. Landing and Login then render
   `<div data-theme="dark">` and inherit the real tokens. That deletes both private palettes and the
   global-theme mutation in `Login.tsx`.
2. **Rename** `--color-danger` → `--color-warning` (low stock / attention) and keep `--color-destructive`.
   Rename the `Button` variant `danger` → `destructive` to match.
3. **Add**: `--color-focus-ring`, `--color-overlay` (modal backdrop), `--color-on-brand-muted` (avatar
   gradient end, replaces `#8a5227`), `--color-knob` (switch knob, replaces `#fff`), and a
   marketing-surface set (`--color-hero-glow`, `--color-surface-elevated`) for Landing/Login gradients.
4. **Spool-art tokens**: `--spool-flange-from/to`, `--spool-hub`, `--spool-spindle`, `--spool-core`,
   `--spool-highlight`, defined per theme. They replace `METAL_TONES` in `SpoolVisualization.tsx` and
   the SVG hex in Landing/Login.
5. **Global focus**: in `index.css`, `:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }`,
   then remove all 9 `outline: none` rules. Inputs get a `:focus-visible` border-color change on top of that.

Typography reaches modules through CSS Modules `composes` (already supported by Vite, so no new
dependency): `src/styles/typography.module.css` exports `.display`, `.h1`, `.h2`, `.title`, `.body`,
`.meta`, `.label`, `.eyebrow`. Feature modules then write `composes: label from '../../styles/typography.module.css';`.

### 3.2 Component inventory (target `src/components/`)

Primitives (new or reworked):

| Component                                                         | API sketch                                                                                                                                                  | Notes                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                          | `variant: 'primary'\|'secondary'\|'ghost'\|'destructive'`, `size: 'sm'\|'md'`, `loading?: boolean`, `icon?`, union `{to} \| {href} \| ButtonHTMLAttributes` | `loading` sets `aria-busy` + disabled and keeps width stable                                                                                                                                                                                                     |
| `IconButton`                                                      | same union, `label: string` (required, becomes `aria-label`), `size`, `variant: 'ghost'\|'subtle'`                                                          | Required label means it can't ship without an accessible name                                                                                                                                                                                                    |
| `Field`                                                           | `label`, `hint?`, `error?`, `children` (render-prop or cloneless context giving `id`, `aria-describedby`, `aria-invalid`)                                   | Uses `useId`. Owns label typography                                                                                                                                                                                                                              |
| `TextInput`, `NumberInput` (`unit?` suffix), `Select`, `Textarea` | native props passthrough + `size`                                                                                                                           | One control style. `NumberInput` absorbs AccountSettings' `.unitRow`                                                                                                                                                                                             |
| `ColorInput`                                                      | `value`, `onChange`                                                                                                                                         | Swatch + hex text pair, duplicated in ReviewForm and FilamentDetail today                                                                                                                                                                                        |
| `Checkbox`, `Switch`                                              | native checkbox underneath (`role="switch"` for Switch)                                                                                                     | `Switch` moves out of `ProfileMenu`                                                                                                                                                                                                                              |
| `SegmentedControl<T>`                                             | today's `ToggleGroup` API, moved to `components/`, arrow-key support                                                                                        | `Tabs` shares its keyboard logic                                                                                                                                                                                                                                 |
| `Tabs`                                                            | add roving tabindex, arrows, `aria-controls`, `TabPanel`                                                                                                    |                                                                                                                                                                                                                                                                  |
| `Card`                                                            | polymorphic `as`, `padding: 'sm'\|'md'\|'lg'`, `tone: 'default'\|'alt'\|'destructive'\|'accent'`, `interactive?`                                            | Replaces ~11 card classes. `SettingsCard`/`DetailCard` become thin compositions                                                                                                                                                                                  |
| `Text` / `Label`                                                  | polymorphic `as`, `variant` = typography roles                                                                                                              | `Label` applies `text-transform: uppercase`. JSX strings return to sentence case                                                                                                                                                                                 |
| `Stat`                                                            | `label`, `value`, `unit?`, `tone?: 'default'\|'warning'`, `size`                                                                                            | 5 call sites                                                                                                                                                                                                                                                     |
| `Badge`                                                           | `tone: 'neutral'\|'brand'\|'warning'\|'success'\|'destructive'`, `dot?`                                                                                     | Static. `Chip` (toggle, `aria-pressed`) is separate                                                                                                                                                                                                              |
| `Chip`                                                            | `pressed`, `onPressedChange`                                                                                                                                | FilterPanel                                                                                                                                                                                                                                                      |
| `ProgressBar`                                                     | `value`, `max`, `tone`, `label` (renders `role="meter"` or `progressbar`)                                                                                   | Width via a `--value` custom property, not inline `width`                                                                                                                                                                                                        |
| `Menu` (`Menu`, `MenuTrigger`, `MenuItem`, `MenuSeparator`)       | composes `useDismissablePanel` + roving focus                                                                                                               | ProfileMenu and the Detail options menu                                                                                                                                                                                                                          |
| `Popover`                                                         | anchored panel and mobile bottom-sheet at ≤640px                                                                                                            | FilterPanel                                                                                                                                                                                                                                                      |
| `Modal`                                                           | `open`, `onClose`, `title`, `description?`, `footer?`, `size`                                                                                               | Native `<dialog>` + `showModal()`: top layer, focus trap, Esc via the `cancel` event, inert background. `useId` for the title. (jsdom may not implement `showModal`; low confidence either way, so verify and add a small shim in `src/test/setup.ts` if needed) |
| `ConfirmDialog`                                                   | `title`, `body`, `confirmLabel`, `tone`, `pending`, `error`, `onConfirm`, `onClose`                                                                         | 3 delete/remove confirmations collapse into this                                                                                                                                                                                                                 |
| `Pagination`                                                      | `page`, `pageCount`, `onPageChange`                                                                                                                         | `aria-current="page"`                                                                                                                                                                                                                                            |
| `EmptyState` / `StatusMessage`                                    | `icon?`, `title`, `body?`, `action?`                                                                                                                        | Not-found, empty filters, error pages                                                                                                                                                                                                                            |
| `ErrorMessage` → `Alert`                                          | `tone: 'error'\|'warning'\|'success'`, `role="alert"` for errors                                                                                            | Keep `ErrorMessage` as an alias during migration                                                                                                                                                                                                                 |
| `BrandMark`                                                       | `size: 'sm'\|'md'`, `withName?`                                                                                                                             | 4 copies → 1                                                                                                                                                                                                                                                     |
| `SpoolArt`                                                        | `color`, `fraction` (0–1), `size`                                                                                                                           | One SVG for Landing, Login and SpoolVisualization. `useId` gradients, colors from spool tokens                                                                                                                                                                   |
| `icons/`                                                          | `NfcIcon`, `GearIcon`, `SwapIcon`, `ChevronLeftIcon`, `CloseIcon`, `MoreIcon`, `SpinnerSpool`                                                               | All `currentColor`, `size` prop, `aria-hidden` by default                                                                                                                                                                                                        |

Utilities: move `formatTag`/`formatStatus` (same function) to `utils/format.ts` as `humanizeEnum`, next to
`formatDate`, `formatRelativeTime` and `formatDuration`. All take the locale/preferences already
threaded through `utils/units.ts`.

Dynamic colors (spool `colorHex`) keep coming in through `style`, which CLAUDE.md's "no inline styles" rule
can't avoid for runtime data. Standardize on setting **only a custom property**
(`style={{ '--swatch': hex }}`) and let CSS consume it. Document that exception in CLAUDE.md.

### 3.3 Polymorphism: typing pattern

```ts
// components/polymorphic.ts
import type { ComponentPropsWithRef, ElementType } from "react";

export type PolymorphicProps<E extends ElementType, P = object> = P & {
  as?: E;
} & Omit<ComponentPropsWithRef<E>, keyof P | "as">;
```

```tsx
// Card: tag-only polymorphism
export function Card<E extends ElementType = "div">({
  as,
  tone = "default",
  padding = "md",
  className,
  ...rest
}: CardProps<E>) {
  const Component = as ?? "div";
  return (
    <Component
      className={cx(styles.card, styles[tone], styles[padding], className)}
      {...rest}
    />
  );
}
// <Card as={Link} to={`/inventory/${id}`} interactive> …SpoolCard body… </Card>
```

```ts
// Button: behavior polymorphism via discriminated union
interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}
type ButtonAsButton = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    to?: never;
    href?: never;
  };
type ButtonAsLink = ButtonBaseProps &
  Omit<LinkProps, keyof ButtonBaseProps> & { href?: never };
type ButtonAsAnchor = ButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
    to?: never;
  };
export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor;
```

Also export `buttonClassName({ variant, size })` for the rare third-party element that needs the look
without the component.

## 4. Phased implementation

Each phase is one `feature/` branch merged into `dev`, gated by `npm run typecheck && npm run lint &&
npm run test`. UI phases also need a browser check at 375px, 768px and desktop, in **both themes**.

### Phase 0: Baseline and guardrails (small)

- [x] Fix the typecheck errors in `client.test.ts`/`members.test.tsx` and the 6 failing tests (missing
      imports; tests now pin `VITE_*` URLs through `test.env` instead of reading the local `.env`).
- [x] Add `src/test/cssGuardrails.test.ts` (implemented in `src/test/cssGuardrails.ts`). It scans every `*.module.css`
      and fails on hex/`rgb()`/`hsl()` literals, raw `'Hanken Grotesk'`/`'JetBrains Mono'`, and `outline: none|0`
      with no replacement ring. `KNOWN_VIOLATIONS` is an exact-match ratchet: counts can only go down, and each
      phase lowers them. Baseline: 73 color literals and 154 font literals across 25 of 30 modules. No new dependency.
- [x] Global `:focus-visible` ring (`--color-focus-ring`, brand color per theme). All 9 `outline: none` rules
      are removed. Borderless inputs inside a styled box (`.searchBox`, `.unitRow`) carry the ring on the wrapper
      via `:focus-within`.

### Phase 1: Tokens (medium, mostly mechanical, visible change ≤2px)

- [x] Create `src/styles/tokens.css` (imported by `index.css`) with the scales in 3.1. Themes are keyed on
      `[data-theme]`. The display sizes became 32/40px instead of 34/42px, so every snap stays within 2px.
- [x] Rename `--color-danger` → `--color-warning`. The chat error text moved to `--color-destructive`, since
      it's an error rather than a warning. Add the focus, overlay, brand-deep, knob, text-subtle, spool and
      marketing tokens.
- [x] Codemod every stylesheet: 153 font shorthands → `var(--text-*) var(--font-*)`, 19 `font-size`s, 96 radii,
      plus all shadows and z-index values → tokens. Setup's `font-size: 1rem` input stays as is: below 16px, iOS
      zooms the page on focus. Phase 2's `TextInput` should use 16px on touch for every input.
- [x] Landing/Login: private palettes deleted; `data-theme="dark"` on the page root; Login's theme-mutation
      `useEffect` removed; SVG hex → spool tokens. ComingSoon now follows the app theme instead of being hard-coded
      dark. Login's background glow now uses the shared brand tint, so it is slightly dimmer than before.
- [x] `SpoolVisualization` reads spool tokens; `useThemeStore` and `METAL_TONES` are gone.
- [x] The guardrail allowlist is empty. The test now covers every `.css` file (including `index.css`), with
      `styles/tokens.css` as the only exception.
- Deferred, deliberately:
  - **Spacing codemod.** The `--space-*` scale exists, but snapping ~400 padding/margin/gap declarations now would
    churn every module that Phases 2 and 4 rewrite anyway. Spacing moves onto the scale as each component is rebuilt.
  - **`typography.module.css`.** Nothing would use it until `Text`/`Label` exist, so it ships with them in Phase 2a.
- Verified with before/after screenshots of 12 views (signed-in pages via a faked Cognito session and the
  `api/mock` fixtures) at 375/768/1440px in both themes. There was no horizontal overflow, and changes were
  ≤2px apart from the Login glow.

### Phase 2: Core primitives (large, split into 2a/2b if needed)

- [x] 2a: `Button` (union, size, loading, `destructive`), `IconButton`, `icons/`, `BrandMark`, `Text`/`Label`,
      `Card`, `Badge`, `Stat`, `ProgressBar`, `Alert`. Add `polymorphic.ts` and a `cx()` helper in `utils/`.
  - The `to`/`href`/button union lives in `ActionElement.tsx` (`ActionProps<Own, ButtonOnly>`). Button and
    IconButton both build on it, so `disabled`/`loading` only type-check on real buttons. `@ts-expect-error`
    tests pin the invalid combinations (`to`+`href`, `loading` on a link, a missing IconButton `label`).
  - `Label` is a `Text` variant (`label`, plus `eyebrow`) rather than a separate component. Roles live in
    `styles/typography.module.css` and can be reached through `composes`. Tone is separate from role.
  - `Badge` has two variants: `tag` (mono caps: PLA, Low) and `status` (pill + dot: Healthy).
    `Chip`, the toggle, stays on the Phase 4 Inventory list.
  - `BrandMark` is the "F" mark only. The wordmark text differs per placement and stays with the caller. The
    AppHeader brand link gained `aria-label="Filacrypt home"`, because on phones with a breadcrumb the visible
    wordmark is hidden and the link was announced as just "F".
  - Adopted now, where it removed exact duplicates: the 4 brand marks, 7 inline SVG icons (Breadcrumb,
    ProfileMenu ×2, LoadingSpool, Chat ×2, Scan ×2, Detail), and 4 hand-styled icon buttons (ProfileMenu ×2,
    chat close, Detail options). `ErrorMessage` now renders an `Alert`, so errors are announced
    (`role="alert"`). Card, Badge, Stat, ProgressBar and `Button to=…` reach the features in Phase 4.
  - Visible changes: secondary/destructive buttons are 2px shorter, now matching primary, and all buttons
    have hover states. ProfileMenu icon buttons are 26px instead of 24px. The Detail options trigger draws an
    SVG instead of the "⋮" character.
  - Pulled forward from Phase 5: a dev-only `/__design` route (`routes/DesignCatalog.tsx`) shows every primitive in
    both themes side by side. The `import.meta.env.DEV` guard keeps it out of production builds (verified:
    no chunk in `dist/`).
- [x] 2b: `Field`, `TextInput`, `NumberInput`, `Select`, `ColorInput`, `Checkbox`, `Switch`,
      `SegmentedControl` (moved from account-settings), `Tabs` keyboard support.
  - `Field` gives its control the id, `aria-describedby` (hint or error) and `aria-invalid` through context
    (`fieldContext.ts`), so it's used as `<Field label="Email"><TextInput /></Field>`. Explicit props on the
    control still win, and describedby ids are merged.
  - All text-like controls share one style (`TextInput.module.css`, which Select and NumberInput reach through
    `composes`). On `pointer: coarse` devices they render at 16px, which stops iOS from zooming the page into a
    focused input. I checked this with iPhone emulation: 14px on desktop, 16px on touch. Inputs reach the
    features in Phase 4.
  - `NumberInput` takes an optional `unit` suffix inside the box, replacing AccountSettings' `.unitRow`.
    `ColorInput` keeps the picker and the hex text box in sync.
  - `Switch` is a native checkbox with `role="switch"`. `SwitchIndicator` is the graphic alone, for rows that
    already carry the state (ProfileMenu's `menuitemcheckbox`). ProfileMenu uses it now, and its duplicate
    switch CSS is deleted.
  - Arrow-key support for both groups comes from one hook, `hooks/useRovingSelection.ts`: roving tabindex,
    arrows/Home/End, wrapping, and a horizontal-only mode for tabs. `SegmentedControl` (formerly
    `features/account-settings/ToggleGroup`) is a labelled radiogroup. `Tabs` takes an optional `id`, and a new
    `TabPanel` links each panel to its tab through `aria-controls`/`aria-labelledby`. AccountSettings uses both,
    with its group labels back in sentence case.
  - Not built: `Textarea`. Nothing in the app uses one yet.
- Each gets a smoke test plus behavior tests: keyboard handling, `aria-*` wiring, and union variants rendering the
  right element (`getByRole('link')` vs `getByRole('button')`).

### Phase 3: Overlays (medium, highest behavior risk)

- [x] `Modal` on `<dialog>`, then `ConfirmDialog`. Migrate the 4 call sites (spool delete, account delete,
      member remove, deletion impact).
  - `Modal` is open while mounted. It opens with `showModal()`: top layer (no z-index), page inert, focus kept
    inside, focus returned to the opener on close, a `useId` title, a `footer` slot and sizes `sm`/`md`.
    `html:has(dialog:modal)` stops the page scrolling behind it.
  - Kept the existing, test-pinned behavior: Escape and backdrop clicks do not close a dialog by default.
    `dismissible` opts in, and nothing uses it yet. One limit: Chrome lets a repeated Escape close a dialog
    when there has been no user activation in between, whatever the page does. `Modal` reports that native
    close through `onCancel`, so app state never shows a dialog the browser has already closed.
  - A bug that only a real browser showed: `close` fires asynchronously, so under StrictMode's double-run
    effects the first cleanup's `close` arrived after the reopen and was treated as a cancel. The dialog
    vanished on open in dev. Fixed by ignoring `close` events that find the dialog open. The jsdom shim
    (`test/dialogShim.ts`; jsdom has no `showModal`) now fires `close` asynchronously like browsers, and a
    StrictMode regression test fails without the fix.
  - `ConfirmDialog` = Modal + Cancel (`secondary`, everywhere now) + confirm (`loading` while pending,
    `confirmDisabled`, `error`). It replaced all four hand-built footers, and the account-delete
    type-to-confirm box now uses `Field`/`TextInput`.
- [x] `Menu` (roving focus, Esc, return focus to trigger). Migrate `ProfileMenu` and the Detail options menu.
  - `Menu`/`MenuGroup`/`MenuItem`: arrows, Home/End, ArrowDown/ArrowUp on the trigger, Escape returns focus,
    Tab closes and continues from the trigger, outside presses close. Items close the menu, except checkbox
    items (`checked` → `menuitemcheckbox`). `MenuItem` takes the same `to`/`href` union as Button.
  - ProfileMenu's gear link and switch-workspace button stay a link and a button, as its tests pin ("no
    longer lists Account settings as its own menu item"). The arrow keys stop on every focusable element in
    the panel, not just `menuitem`s, so both stay reachable by keyboard.
- [x] `Popover` with mobile sheet. Migrate `FilterPanel`. Switch `useDismissablePanel` to `pointerdown`.
  - Non-modal `role="dialog"` anchored to its trigger. At ≤640px it becomes a bottom sheet over a backdrop,
    replacing FilterPanel's full-screen takeover. Focus goes into it on open and back to the trigger on
    Escape or an inside close.
- Verified in real Chromium against the `/__design` overlay demos and the real pages:
  - The confirm dialog is `:modal`, focus starts inside, Tab stays inside, and the page doesn't scroll.
    Backdrop clicks, Escape and a second Escape are ignored, and focus returns to the opener on close.
  - The dismissible modal closes on Escape and on backdrop clicks.
  - Menu keyboard behavior works as listed above.
  - On an iPhone viewport, the bottom sheet hugs the viewport bottom at full width, and tapping the backdrop
    closes it.
  - Before/after screenshots changed only the filter panel (sheet), the profile menu (2px higher) and the
    delete dialog (gains a shadow).

### Phase 4: Feature migration (large, one PR per feature)

Order goes from least to most custom: **Setup → AccountSettings (+Members, DeletionImpact) → Inventory
(SpoolCard → `Card as={Link}`, Pagination, Chip filters) → ScanSpool/ReviewForm → FilamentDetail (edit
mode onto `Field`/inputs; `DetailCard` as a `Card` composition) → Chat → Login/CodeInput → Landing
(Button `to`/`href`, `SpoolArt`) → ComingSoon/`EmptyState`.**

Per feature: delete the local copies (`.input`, `.fieldLabel`, `.modalActions`, `.badge`, button-like
classes), return uppercase JSX strings to sentence case, and replace local `format*` helpers with
`utils/format.ts`. Expect test updates where tests query uppercase text or the old roles (SpoolCard
becomes a link).

### Phase 5: Documentation and lock-in (small)

- [ ] Update CLAUDE.md: token scales, "use `components/` primitives before writing a local control",
      the `style` custom-property exception, and themed subtrees via `data-theme`.
- [ ] Optional, needs a dependency discussion per CLAUDE.md: Storybook or Ladle for a visual catalog. Without
      one, add a dev-only `/__design` route listing every primitive in both themes, which also works for
      manual phone/iPad checks.

## 5. Risks and decisions needed

| Item                                          | Recommendation                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Snapping radius/type values changes pixels    | Accept it. Changes are ≤2px and the mockups were never mutually consistent (CLAUDE.md already says so). Review screenshots per phase. |
| `<dialog>` in jsdom                           | Verify early in Phase 3. A shim in `test/setup.ts` is acceptable, a third-party dialog library isn't.                                 |
| Union-typed `Button` error messages are noisy | Acceptable. Keep the union to 3 members and cover it with type tests (`// @ts-expect-error` cases).                                   |
| Landing stays dark in light mode              | Product decision. The plan keeps today's behavior (forced dark subtree) but makes it a one-attribute change.                          |
| Breakpoints can't be tokens                   | Keep the 640/860 literals. `@custom-media` would need PostCSS plugins (a new dependency).                                             |

## 6. Effort estimate (rough, single developer, moderate confidence)

Phase 0: ½ day · Phase 1: 1–1½ days · Phase 2: 2–3 days · Phase 3: 1½–2 days · Phase 4: 3–4 days · Phase 5: ½ day.
