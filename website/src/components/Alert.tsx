import type { ReactNode } from 'react';
import { cx } from '../utils/cx';
import styles from './Alert.module.css';

export type AlertTone = 'error' | 'warning' | 'success' | 'info';

export interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}

/**
 * An inline message. Errors are announced immediately (`role="alert"`); other
 * tones politely (`role="status"`). Render it only when there's something to
 * say -- a live region that appears with its content is what gets announced.
 */
export function Alert({ tone = 'info', children, className }: AlertProps) {
  return (
    <p
      className={cx(styles.alert, styles[tone], className)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}
