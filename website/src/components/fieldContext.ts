import { createContext, useContext } from 'react';

export interface FieldContextValue {
  /** id for the control, so the Field's <label htmlFor> points at it. */
  id: string;
  /** ids of the hint and/or error text, for aria-describedby. */
  describedBy: string | undefined;
  invalid: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

interface ControlA11yProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
}

/**
 * Merges a control's own id/aria props with those from an enclosing Field.
 * The control's explicit props win; describedby ids are combined.
 */
export function useFieldControlProps<P extends ControlA11yProps>(props: P): P {
  const field = useContext(FieldContext);
  if (!field) return props;
  const describedBy = [props['aria-describedby'], field.describedBy].filter(Boolean).join(' ');
  return {
    ...props,
    id: props.id ?? field.id,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': props['aria-invalid'] ?? (field.invalid || undefined),
  };
}
