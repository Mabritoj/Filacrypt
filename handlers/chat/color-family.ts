export const COLOR_FAMILIES = [
  'black', 'white', 'gray', 'red', 'orange', 'yellow',
  'green', 'cyan', 'blue', 'purple', 'pink', 'brown',
] as const;

export type ColorFamily = (typeof COLOR_FAMILIES)[number];

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): Hsl | null {
  const normalized = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;

  return { h, s, l };
}

/**
 * Buckets a hex colour into a named family so spools can be searched by colour
 * name. Returns null for absent or malformed input rather than guessing.
 */
export function colorFamily(hex: string | undefined): ColorFamily | null {
  if (!hex) return null;
  const hsl = hexToHsl(hex);
  if (!hsl) return null;

  const { h, s, l } = hsl;

  if (l <= 0.12) return 'black';
  if (l >= 0.92) return 'white';
  if (s <= 0.12) return 'gray';

  // Brown is dark, saturated orange — it has no hue range of its own.
  if (h >= 15 && h < 45 && l < 0.4) return 'brown';

  if (h < 15 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 165) return 'green';
  if (h < 195) return 'cyan';
  if (h < 255) return 'blue';
  if (h < 330) return 'purple';
  return 'pink';
}
