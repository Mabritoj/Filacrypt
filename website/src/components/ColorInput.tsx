import { useContext } from 'react';
import { cx } from '../utils/cx';
import { FieldContext, useFieldControlProps } from './fieldContext';
import { TextInput } from './TextInput';
import styles from './ColorInput.module.css';

export interface ColorInputProps {
  /** A #rrggbb hex value. */
  value: string;
  onChange: (hex: string) => void;
  /**
   * Names the controls: the picker is `label` (unless a Field labels it), the
   * text box `${label} hex code`.
   */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * A color picker paired with an editable hex code, kept in sync. Inside a
 * Field, the Field's label (and hint/error) belong to the picker; the hex box
 * keeps its own name and sits outside the Field wiring so the two never share
 * an id.
 */
export function ColorInput({
  value,
  onChange,
  label = 'Color',
  size = 'md',
  className,
}: ColorInputProps) {
  const inField = useContext(FieldContext) !== null;
  const pickerProps = useFieldControlProps<{ id?: string; 'aria-label'?: string }>({
    'aria-label': inField ? undefined : label,
  });

  return (
    <div className={cx(styles.group, size === 'sm' && styles.sm, className)}>
      <input
        type="color"
        className={styles.swatch}
        {...pickerProps}
        // The native picker only accepts a full #rrggbb; anything still being
        // typed in the text box shows as the last valid color.
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#888888'}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldContext.Provider value={null}>
        <TextInput
          aria-label={`${label} hex code`}
          size={size}
          className={styles.hex}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
      </FieldContext.Provider>
    </div>
  );
}
