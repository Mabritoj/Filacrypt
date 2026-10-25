import { describe, expect, it } from 'vitest';
import { formatDate, formatDuration, formatRelativeTime, humanizeEnum } from './format';

describe('humanizeEnum', () => {
  it('title-cases snake_case values', () => {
    expect(humanizeEnum('contains_carbon_fiber')).toBe('Contains Carbon Fiber');
    expect(humanizeEnum('in_use')).toBe('In Use');
  });

  it('leaves a single word capitalized', () => {
    expect(humanizeEnum('matte')).toBe('Matte');
  });
});

describe('formatDate', () => {
  it('formats an ISO date', () => {
    expect(formatDate('2025-11-20T12:00:00Z')).toBe('Nov 20, 2025');
  });

  it('shows an em dash for a missing date', () => {
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-01-10T12:00:00Z');

  it('says "Never" for a missing time', () => {
    expect(formatRelativeTime(undefined, now)).toBe('Never');
  });

  it('rounds to hours, then days', () => {
    expect(formatRelativeTime('2026-01-10T11:45:00Z', now)).toBe('Just now');
    expect(formatRelativeTime('2026-01-10T11:00:00Z', now)).toBe('1 hour ago');
    expect(formatRelativeTime('2026-01-10T07:00:00Z', now)).toBe('5 hours ago');
    expect(formatRelativeTime('2026-01-09T12:00:00Z', now)).toBe('1 day ago');
    expect(formatRelativeTime('2026-01-01T12:00:00Z', now)).toBe('9 days ago');
  });
});

describe('formatDuration', () => {
  it('formats minutes as hours and padded minutes', () => {
    expect(formatDuration(65)).toBe('1h 05m');
    expect(formatDuration(131)).toBe('2h 11m');
  });

  it('shows an em dash when unknown', () => {
    expect(formatDuration(undefined)).toBe('—');
  });
});
