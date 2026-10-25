import type { ReactNode } from 'react';
import { cx } from '../utils/cx';
import { Text } from './Text';
import styles from './Stat.module.css';

export interface StatProps {
  /** Sentence case -- it's displayed in caps by the label style. */
  label: string;
  value: ReactNode;
  /** Shown smaller after the value, e.g. "g". */
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'warning';
  /** Put the label under the value instead of above it. */
  labelPosition?: 'top' | 'bottom';
  className?: string;
}

/** A labelled value: a stat tile's contents, a spec in a list. Wrap it in a Card for a tile. */
export function Stat({
  label,
  value,
  unit,
  size = 'md',
  tone = 'default',
  labelPosition = 'top',
  className,
}: StatProps) {
  return (
    <div
      className={cx(
        styles.stat,
        styles[size],
        tone === 'warning' && styles.warning,
        labelPosition === 'bottom' && styles.labelBottom,
        className,
      )}
    >
      <Text variant="label" tone={tone === 'warning' ? 'warning' : 'muted'}>
        {label}
      </Text>
      <span className={styles.value}>
        {value}
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
    </div>
  );
}
