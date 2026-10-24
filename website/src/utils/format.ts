/**
 * Turns a snake_case enum value into display text: `contains_carbon_fiber`
 * → "Contains Carbon Fiber", `in_use` → "In Use".
 */
export function humanizeEnum(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/** "Nov 20, 2025", or an em dash when there's no date. */
export function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "Just now", "5 hours ago", "108 days ago" -- or "Never" when there's no date. */
export function formatRelativeTime(iso?: string, now: number = Date.now()): string {
  if (!iso) return 'Never';
  const hours = Math.round((now - new Date(iso).getTime()) / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** Minutes as "1h 05m", or an em dash when unknown. */
export function formatDuration(minutes?: number): string {
  if (!minutes) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}
