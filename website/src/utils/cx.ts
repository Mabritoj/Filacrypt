/** Joins class names, skipping falsy entries: `cx(styles.a, isOn && styles.on, className)`. */
export function cx(...classNames: (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
