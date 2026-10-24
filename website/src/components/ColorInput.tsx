import { cx } from '../utils/cx';
import { TextInput } from './TextInput';
import styles from './ColorInput.module.css';

export interface ColorInputProps {
  /** A #rrggbb hex value. */
  value: string;
  onChange: (hex: string) => void;
  /** Names both controls: the picker is `label`, the text box `${label} hex code`. */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * A color picker paired with an editable hex code, kept in sync. Inside a
 * Field, the Field's label targets the hex text box.
 */
export function ColorInput({
  value,
  onChange,
  label = 'Color',
  size = 'md',
  className,
}: ColorInputProps) {
  return (
    <div className={cx(styles.group, size === 'sm' && styles.sm, className)}>
      <input
        type="color"
        aria-label={label}
        className={styles.swatch}
        // The native picker only accepts a full #rrggbb; anything still being
        // typed in the text box shows as the last valid color.
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#888888'}
        onChange={(event) => onChange(event.target.value)}
      />
      <TextInput
        aria-label={`${label} hex code`}
        size={size}
        className={styles.hex}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}
