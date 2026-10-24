// @vitest-environment node -- reads source files from disk; no DOM needed.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { findCssViolations, type CssViolations } from './cssGuardrails';

/**
 * Known violations, per module, as of the design-system alignment plan
 * (docs/design-system-alignment-plan.md). This is a ratchet: counts must
 * match exactly, so fixing a violation means lowering its number here (or
 * deleting the entry once it reaches zero), and nothing new can be added.
 * Files not listed must have no violations at all. Phase 1 (tokens) is done
 * when this list is empty.
 */
const KNOWN_VIOLATIONS: Record<string, Partial<CssViolations>> = {
  'components/AppHeader.module.css': { fonts: 2 },
  'components/Breadcrumb.module.css': { fonts: 2 },
  'components/Button.module.css': { fonts: 4 },
  'components/Modal.module.css': { colors: 1, fonts: 2 },
  'components/PageShell.module.css': { fonts: 1 },
  'components/ProfileMenu.module.css': { colors: 4, fonts: 5 },
  'components/Tabs.module.css': { fonts: 1 },
  'features/account-settings/AccountSettings.module.css': { colors: 1, fonts: 15 },
  'features/account-settings/MembersSection.module.css': { fonts: 1 },
  'features/account-settings/SettingsCard.module.css': { fonts: 2 },
  'features/account-settings/ToggleGroup.module.css': { fonts: 2 },
  'features/auth/CodeInput.module.css': { fonts: 1 },
  'features/auth/Login.module.css': { colors: 21, fonts: 9 },
  'features/chat/ChatWidget.module.css': { colors: 1 },
  'features/filament-detail/DetailCard.module.css': { fonts: 3 },
  'features/filament-detail/FilamentDetail.module.css': { colors: 1, fonts: 17 },
  'features/filament-detail/SpoolVisualization.module.css': { fonts: 4 },
  'features/filament-detail/UsageHistoryTable.module.css': { fonts: 7 },
  'features/inventory/FilterPanel.module.css': { colors: 1, fonts: 8 },
  'features/inventory/InventoryHome.module.css': { fonts: 9 },
  'features/inventory/SpoolCard.module.css': { fonts: 7 },
  'features/landing/Landing.module.css': { colors: 39, fonts: 30 },
  'features/scan-spool/ReviewForm.module.css': { fonts: 3 },
  'features/scan-spool/ScanSpool.module.css': { fonts: 15 },
  'routes/ComingSoon.module.css': { colors: 3, fonts: 3 },
};

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

function listCssModules(): string[] {
  return (readdirSync(SRC_DIR, { recursive: true }) as string[])
    .filter((file) => file.endsWith('.module.css'))
    .map((file) => relative(SRC_DIR, join(SRC_DIR, file)).split('\\').join('/'))
    .sort();
}

function expectedFor(file: string): CssViolations {
  return { colors: 0, fonts: 0, focusSuppressions: 0, ...KNOWN_VIOLATIONS[file] };
}

describe('CSS module guardrails', () => {
  const files = listCssModules();

  test('finds the CSS modules', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(files)('%s stays on design tokens', (file) => {
    const actual = findCssViolations(readFileSync(join(SRC_DIR, file), 'utf8'));
    expect(
      actual,
      'Use var(--color-*) / font tokens and the global :focus-visible ring. If you ' +
        'removed violations, lower this file in KNOWN_VIOLATIONS to match.',
    ).toEqual(expectedFor(file));
  });

  test('KNOWN_VIOLATIONS lists only files that exist', () => {
    const stale = Object.keys(KNOWN_VIOLATIONS).filter((file) => !files.includes(file));
    expect(stale).toEqual([]);
  });
});

describe('findCssViolations', () => {
  test('counts hex and functional color literals', () => {
    const css = '.a { color: #fff; background: rgba(0, 0, 0, 0.4); border-color: #12345678; }';
    expect(findCssViolations(css).colors).toBe(3);
  });

  test('ignores colors and fonts inside comments', () => {
    const css = "/* was #cf9161 in 'Hanken Grotesk' */ .a { color: var(--color-brand); }";
    expect(findCssViolations(css)).toEqual({ colors: 0, fonts: 0, focusSuppressions: 0 });
  });

  test('counts raw font family literals', () => {
    const css =
      ".a { font: 600 13px 'Hanken Grotesk', sans-serif; } .b { font-family: 'JetBrains Mono'; }";
    expect(findCssViolations(css).fonts).toBe(2);
  });

  test('flags outline suppression on a base rule', () => {
    expect(findCssViolations('.input { border: none; outline: none; }').focusSuppressions).toBe(1);
    expect(findCssViolations('.input { outline: 0 }').focusSuppressions).toBe(1);
  });

  test('flags outline suppression inside a media query', () => {
    const css = '@media (max-width: 640px) { .input { outline: none; } }';
    expect(findCssViolations(css).focusSuppressions).toBe(1);
  });

  test('allows opting an inner input out when its wrapper carries the ring', () => {
    const css = `
      .box:focus-within { outline: 2px solid var(--color-focus-ring); }
      .inner:focus-visible { outline: none; }
    `;
    expect(findCssViolations(css).focusSuppressions).toBe(0);
  });

  test('flags a :focus-visible opt-out with no wrapper ring in the module', () => {
    expect(findCssViolations('.inner:focus-visible { outline: none; }').focusSuppressions).toBe(1);
  });

  test('does not treat outline-offset or a real outline as suppression', () => {
    const css = '.a { outline: 2px solid var(--color-focus-ring); outline-offset: 0; }';
    expect(findCssViolations(css).focusSuppressions).toBe(0);
  });
});
