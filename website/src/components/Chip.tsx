import type { ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';
import styles from './Chip.module.css';

export interface ChipProps extends Omit<ComponentPropsWithRef<'button'>, 'type'> {
  /** Whether this option is currently on. */
  pressed: boolean;
}

/**
 * A toggleable option, usually one of several in a filter row. It's a
 * button with `aria-pressed`, so each chip is independently on or off; for
 * one-of-many, use SegmentedControl. For a static label, use Badge.
 */
export function Chip({ pressed, className, ...rest }: ChipProps) {
  return (
    <button type="button" aria-pressed={pressed} className={cx(styles.chip, className)} {...rest} />
  );
}
