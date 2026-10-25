import type { ComponentPropsWithRef } from 'react';
import { cx } from '../utils/cx';
import { useFieldControlProps } from './fieldContext';
import styles from './TextInput.module.css';

export interface TextInputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  size?: 'sm' | 'md';
}

/** A styled `<input>`. Inside a Field it picks up the label, hint and error wiring. */
export function TextInput({ size = 'md', className, ...rest }: TextInputProps) {
  const props = useFieldControlProps(rest);
  return <input className={cx(styles.control, styles[size], className)} {...props} />;
}
