import type { CSSProperties } from 'react';
import { cx } from '../utils/cx';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number;
  max?: number;
  /** Accessible name, e.g. "Filament remaining". */
  label: string;
  tone?: 'brand' | 'warning' | 'success';
  size?: 'sm' | 'md';
  className?: string;
}

/** A horizontal fill for a known quantity -- filament left, tag memory used. */
export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'brand',
  size = 'md',
  className,
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (clamped / max) * 100 : 0;
  // Runtime data can only reach CSS through `style`; passing it as a custom
  // property (not `width`) keeps the actual styling in the module.
  const fillStyle = { '--progress': `${percent}%` } as CSSProperties;

  return (
    <div
      className={cx(styles.track, styles[size], className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
    >
      <div className={cx(styles.fill, styles[tone])} style={fillStyle} />
    </div>
  );
}
