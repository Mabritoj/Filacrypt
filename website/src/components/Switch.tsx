import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';
import styles from './Switch.module.css';

export interface SwitchProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> {
  /** The visible label, shown before the switch; clicking it toggles. */
  children: ReactNode;
}

/**
 * An on/off setting that applies immediately. A native checkbox with
 * role="switch" underneath, so forms, keyboard and screen readers all work.
 */
export function Switch({ children, className, ...rest }: SwitchProps) {
  return (
    <label className={cx(styles.row, className)}>
      <span>{children}</span>
      <input type="checkbox" role="switch" className={styles.input} {...rest} />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </label>
  );
}

export interface SwitchIndicatorProps {
  on: boolean;
  className?: string;
}

/**
 * Just the switch graphic, for when a larger control already carries the
 * state -- e.g. a `menuitemcheckbox` row with `aria-checked`. Decorative.
 */
export function SwitchIndicator({ on, className }: SwitchIndicatorProps) {
  return (
    <span className={cx(styles.track, className)} data-on={on} aria-hidden="true">
      <span className={styles.knob} />
    </span>
  );
}
