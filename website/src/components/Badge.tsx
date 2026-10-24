import type { ReactNode } from 'react';
import { cx } from '../utils/cx';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'brand' | 'warning' | 'success' | 'destructive';

export interface BadgeProps {
  /**
   * `tag` (mono caps, square) names what something is -- a material, a finish.
   * `status` (sans, pill, leading dot) says what state it's in.
   */
  variant?: 'tag' | 'status';
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

/** Static label. For a toggleable filter, use a pressed button instead. */
export function Badge({
  variant = 'tag',
  tone = 'neutral',
  size = 'md',
  children,
  className,
}: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[variant], styles[size], styles[tone], className)}>
      {variant === 'status' && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
