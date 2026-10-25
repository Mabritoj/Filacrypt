import { cx } from '../utils/cx';
import { TextInput, type TextInputProps } from './TextInput';
import { useFieldControlProps } from './fieldContext';
import inputStyles from './TextInput.module.css';
import styles from './NumberInput.module.css';

export interface NumberInputProps extends Omit<TextInputProps, 'type'> {
  /** Shown inside the box after the number, e.g. "grams". */
  unit?: string;
}

/** A number input, optionally with a unit suffix inside the same box. */
export function NumberInput({ unit, size = 'md', className, ...rest }: NumberInputProps) {
  const props = useFieldControlProps(rest);
  if (!unit) {
    return <TextInput type="number" size={size} className={className} {...props} />;
  }
  return (
    <div className={cx(styles.wrapper, inputStyles[size], className)}>
      <input type="number" className={styles.bare} {...props} />
      <span className={styles.unit} aria-hidden="true">
        {unit}
      </span>
    </div>
  );
}
