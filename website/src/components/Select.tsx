import type { ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';
import { useFieldControlProps } from './fieldContext';
import inputStyles from './TextInput.module.css';
import styles from './Select.module.css';

export interface SelectProps extends Omit<ComponentPropsWithRef<'select'>, 'size'> {
  size?: 'sm' | 'md';
}

/** A styled native `<select>` -- pass `<option>`s as children. */
export function Select({ size = 'md', className, ...rest }: SelectProps) {
  const props = useFieldControlProps(rest);
  return <select className={cx(styles.select, inputStyles[size], className)} {...props} />;
}
