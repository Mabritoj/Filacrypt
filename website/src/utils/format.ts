/**
 * Turns a snake_case enum value into display text: `contains_carbon_fiber`
 * → "Contains Carbon Fiber", `in_use` → "In Use".
 */
export function humanizeEnum(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
