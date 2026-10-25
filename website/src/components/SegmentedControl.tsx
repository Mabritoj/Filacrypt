import { useId } from 'react';
import { useRovingSelection } from '../hooks/useRovingSelection';
import { cx } from '../utils/cx';
import { Text } from './Text';
import styles from './SegmentedControl.module.css';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  /** Sentence case -- it's displayed in caps by the label style. */
  label: string;
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * A row of mutually exclusive options -- a radio group styled as one control.
 * Tab reaches the selected option; the arrow keys change the selection.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const labelId = useId();
  const { onKeyDown, itemProps } = useRovingSelection(
    options.map((option) => option.value),
    value,
    onChange,
  );

  return (
    <div className={cx(styles.root, className)}>
      <Text id={labelId} variant="eyebrow" className={styles.label}>
        {label}
      </Text>
      <div
        className={styles.group}
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={styles.option}
            onClick={() => onChange(option.value)}
            {...itemProps(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
