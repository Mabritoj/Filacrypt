// @vitest-environment node -- reads source files from disk; no DOM needed.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { findCssViolations, type CssViolations } from './cssGuardrails';

/** Where the raw values live -- the one file allowed to contain them. */
const TOKENS_FILE = 'styles/tokens.css';

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));

function listStylesheets(): string[] {
  return (readdirSync(SRC_DIR, { recursive: true }) as string[])
    .filter((file) => file.endsWith('.css'))
    .map((file) => relative(SRC_DIR, join(SRC_DIR, file)).split('\\').join('/'))
    .filter((file) => file !== TOKENS_FILE)
    .sort();
}

const NO_VIOLATIONS: CssViolations = { colors: 0, fonts: 0, focusSuppressions: 0 };

describe('stylesheet guardrails', () => {
  const files = listStylesheets();

  test('finds the stylesheets', () => {
    expect(files).toContain('index.css');
    expect(files.some((file) => file.endsWith('.module.css'))).toBe(true);
  });

  test.each(files)('%s stays on design tokens', (file) => {
    const actual = findCssViolations(readFileSync(join(SRC_DIR, file), 'utf8'));
    expect(
      actual,
      `Use the tokens in ${TOKENS_FILE} (var(--color-*), var(--font-*)) and the ` +
        'global :focus-visible ring instead of literals or outline: none.',
    ).toEqual(NO_VIOLATIONS);
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
