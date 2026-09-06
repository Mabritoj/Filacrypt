import { describe, expect, it } from 'vitest';
import { formatWeight, formatTemperature, formatLength, formatCurrency } from './units';

describe('formatWeight', () => {
  it('renders grams as-is', () => {
    expect(formatWeight(720, 'g')).toBe('720 g');
  });

  it('converts grams to kilograms', () => {
    expect(formatWeight(720, 'kg')).toBe('0.72 kg');
  });
});

describe('formatTemperature', () => {
  it('renders Celsius as-is', () => {
    expect(formatTemperature(205, 'C')).toBe('205 °C');
  });

  it('converts Celsius to Fahrenheit', () => {
    expect(formatTemperature(205, 'F')).toBe('401 °F');
  });
});

describe('formatLength', () => {
  it('renders meters, rounded', () => {
    expect(formatLength(331000, 'm')).toBe('331 m');
  });

  it('converts millimeters to feet, rounded', () => {
    expect(formatLength(331000, 'ft')).toBe('1086 ft');
  });
});

describe('formatCurrency', () => {
  it('renders USD with a $ symbol', () => {
    expect(formatCurrency(2999, 'USD')).toBe('$29.99');
  });

  it('renders EUR with a € symbol', () => {
    expect(formatCurrency(2999, 'EUR')).toBe('€29.99');
  });

  it('renders GBP with a £ symbol', () => {
    expect(formatCurrency(2999, 'GBP')).toBe('£29.99');
  });

  it('falls back to the currency code for an unmapped currency', () => {
    expect(formatCurrency(2999, 'JPY')).toBe('29.99 JPY');
  });
});
