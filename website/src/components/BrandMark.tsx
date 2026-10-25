import { cx } from '../utils/cx';
import styles from './BrandMark.module.css';

export interface BrandMarkProps {
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * The square "F" logo mark. Decorative: put it inside a link or heading that
 * carries the "Filacrypt" name (as visible text or an aria-label), since the
 * wordmark next to it is hidden on narrow screens in some places.
 */
export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  return (
    <span className={cx(styles.mark, styles[size], className)} aria-hidden="true">
      F
    </span>
  );
}
