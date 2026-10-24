import type { ElementType } from 'react';
import { cx } from '../utils/cx';
import type { PolymorphicProps } from './polymorphic';
import styles from './Card.module.css';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardTone = 'default' | 'sunken' | 'accent' | 'destructive';

interface CardOwnProps {
  padding?: CardPadding;
  /**
   * `sunken` sits a step below the surface (a stat inside a card), `accent`
   * highlights (the NFC tag band), `destructive` frames irreversible actions.
   */
  tone?: CardTone;
  /** Hover affordance plus button/link resets -- use with `as={Link}` or `as="button"`. */
  interactive?: boolean;
  className?: string;
}

export type CardProps<E extends ElementType = 'div'> = PolymorphicProps<E, CardOwnProps>;

/**
 * A bordered surface. Renders a `div` unless told otherwise:
 * `<Card as="section">`, `<Card as="li">`, or for a whole-card link
 * `<Card as={Link} to={`/inventory/${id}`} interactive>`.
 */
export function Card<E extends ElementType = 'div'>({
  as,
  padding = 'md',
  tone = 'default',
  interactive = false,
  className,
  ...rest
}: CardProps<E>) {
  const Component: ElementType = as ?? 'div';
  return (
    <Component
      className={cx(
        styles.card,
        styles[padding],
        styles[tone],
        interactive && styles.interactive,
        className,
      )}
      {...rest}
    />
  );
}
