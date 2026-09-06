export type WeightUnit = 'g' | 'kg';
export type TemperatureUnit = 'C' | 'F';
export type LengthUnit = 'm' | 'ft';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatWeight(grams: number, unit: WeightUnit): string {
  if (unit === 'kg') return `${(grams / 1000).toFixed(2)} kg`;
  return `${Math.round(grams)} g`;
}

export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  if (unit === 'F') return `${Math.round((celsius * 9) / 5 + 32)} °F`;
  return `${Math.round(celsius)} °C`;
}

export function formatLength(mm: number, unit: LengthUnit): string {
  const meters = mm / 1000;
  if (unit === 'ft') return `${Math.round(meters * 3.28084)} ft`;
  return `${Math.round(meters)} m`;
}

export function formatCurrency(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  const symbol = CURRENCY_SYMBOLS[currency];
  return symbol ? `${symbol}${amount}` : `${amount} ${currency}`;
}
