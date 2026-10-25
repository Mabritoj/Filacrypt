import type { ReactNode } from 'react';
import { cx } from '../utils/cx';
import { ActionElement, type ActionProps } from './ActionElement';
import { SpoolIcon } from './icons';
import styles from './Button.module.css';
import spinStyles from './spoolSpin.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Rendered before the label. */
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

interface ButtonOnlyProps {
  /**
   * Shows a spinner in place of `icon`, disables the button and marks it
   * busy. Keep the label meaningful ("Saving…") -- it's still what's announced.
   */
  loading?: boolean;
}

/**
 * `<Button to="/inventory">` renders a router link, `<Button href="#how">` an
 * anchor, anything else a `<button type="button">` -- all with the same look.
 */
export type ButtonProps = ActionProps<ButtonOwnProps, ButtonOnlyProps>;

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cx(styles.button, styles[size], styles[variant], className);

  if (rest.to === undefined && rest.href === undefined) {
    const { loading, disabled, ...buttonProps } = rest as ButtonOnlyProps & {
      disabled?: boolean;
    };
    return (
      <ActionElement
        {...buttonProps}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
      >
        {loading ? <SpoolIcon size={14} className={cx(styles.spinner, spinStyles.spin)} /> : icon}
        {children}
      </ActionElement>
    );
  }

  return (
    <ActionElement {...rest} className={classes}>
      {icon}
      {children}
    </ActionElement>
  );
}
