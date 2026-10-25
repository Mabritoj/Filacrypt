import { useId, type ReactNode } from 'react';
import { cx } from '../utils/cx';
import { FieldContext } from './fieldContext';
import { Text } from './Text';
import styles from './Field.module.css';

export interface FieldProps {
  /** Sentence case -- it's displayed in caps by the label style. */
  label: ReactNode;
  /** Help text under the control. */
  hint?: ReactNode;
  /** Validation message. Replaces the hint and marks the control invalid. */
  error?: string;
  /** Use an explicit id when something outside the Field needs to target the control. */
  id?: string;
  /** One control from this folder (TextInput, Select, ...), which picks up the wiring. */
  children: ReactNode;
  className?: string;
}

/**
 * Label + control + hint/error, wired for assistive tech: the label targets
 * the control, the hint/error is its description, and an error sets
 * aria-invalid. The control reads all of this from context, so just nest it.
 */
export function Field({ label, hint, error, id, children, className }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cx(styles.field, className)}>
      <Text as="label" variant="eyebrow" htmlFor={controlId} className={styles.label}>
        {label}
      </Text>
      <FieldContext.Provider value={{ id: controlId, describedBy, invalid: !!error }}>
        {children}
      </FieldContext.Provider>
      {error ? (
        <Text id={errorId} variant="meta" tone="destructive" as="p">
          {error}
        </Text>
      ) : (
        hint && (
          <Text id={hintId} variant="meta" as="p">
            {hint}
          </Text>
        )
      )}
    </div>
  );
}
