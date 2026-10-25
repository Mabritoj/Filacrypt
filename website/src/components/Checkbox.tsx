import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> {
  /** The visible label; clicking it toggles the box. */
  children: ReactNode;
}

export function Checkbox({ children, className, ...rest }: CheckboxProps) {
  return (
    <label className={cx(styles.checkbox, className)}>
      <input type="checkbox" className={styles.input} {...rest} />
      <span>{children}</span>
    </label>
  );
}
