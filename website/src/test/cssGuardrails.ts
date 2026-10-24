/**
 * Static checks that keep CSS modules on the design tokens in index.css.
 * Pure string analysis -- no CSS parser dependency -- which is enough for the
 * flat, nesting-free CSS this codebase writes.
 */

export interface CssViolations {
  /** Hex, rgb()/rgba() or hsl()/hsla() literals -- use a var(--color-*) token. */
  colors: number;
  /** 'Hanken Grotesk' / 'JetBrains Mono' written out -- use a font token. */
  fonts: number;
  /** `outline: none|0` that removes the keyboard focus ring without a replacement. */
  focusSuppressions: number;
}

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g;
const FONT_LITERAL = /'Hanken Grotesk'|'JetBrains Mono'/g;
// Innermost `selector { declarations }` blocks. An @media wrapper's own
// brace is skipped because its body contains braces, so each nested rule is
// still matched with its own selector.
const RULE = /([^{}]+)\{([^{}]*)\}/g;
const OUTLINE_SUPPRESSION = /(?:^|;)\s*outline\s*:\s*(?:none|0)\s*(?:;|$)/;

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/**
 * An outline suppression is only allowed in a `:focus-visible` rule, and only
 * when the same module puts a ring on a wrapper with `:focus-within` -- the
 * pattern index.css documents for borderless inputs inside a styled box.
 */
function countFocusSuppressions(css: string): number {
  const hasFocusWithinRing = css.includes(':focus-within');
  let count = 0;
  for (const [, selector, body] of css.matchAll(RULE)) {
    if (!OUTLINE_SUPPRESSION.test(body)) continue;
    const exempt = selector.includes(':focus-visible') && hasFocusWithinRing;
    if (!exempt) count += 1;
  }
  return count;
}

export function findCssViolations(source: string): CssViolations {
  const css = stripComments(source);
  return {
    colors: countMatches(css, COLOR_LITERAL),
    fonts: countMatches(css, FONT_LITERAL),
    focusSuppressions: countFocusSuppressions(css),
  };
}
