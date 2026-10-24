import type { ElementType } from 'react';
import { cx } from '../utils/cx';
import type { PolymorphicProps } from './polymorphic';
import styles from '../styles/typography.module.css';

export type TextVariant =
  'display' | 'h1' | 'h2' | 'title' | 'body' | 'bodySm' | 'meta' | 'label' | 'eyebrow';

export type TextTone =
  'default' | 'muted' | 'subtle' | 'brand' | 'warning' | 'destructive' | 'success';

interface TextOwnProps {
  variant?: TextVariant;
  /** Defaults to `muted` for meta/label/eyebrow and `default` otherwise. */
  tone?: TextTone;
  className?: string;
}

export type TextProps<E extends ElementType = 'span'> = PolymorphicProps<E, TextOwnProps>;

const DEFAULT_ELEMENT: Record<TextVariant, ElementType> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  title: 'h3',
  body: 'p',
  bodySm: 'p',
  meta: 'span',
  label: 'span',
  eyebrow: 'span',
};

const MUTED_BY_DEFAULT = new Set<TextVariant>(['meta', 'label', 'eyebrow']);

/**
 * Text in one of the app's typography roles. The element defaults to what the
 * role usually is (h1 for `h1`, p for `body`, ...) -- pass `as` when the
 * document outline needs something else, e.g. `<Text variant="title" as="h2">`.
 */
export function Text<E extends ElementType = 'span'>({
  as,
  variant = 'body',
  tone,
  className,
  ...rest
}: TextProps<E>) {
  const Component: ElementType = as ?? DEFAULT_ELEMENT[variant];
  const resolvedTone = tone ?? (MUTED_BY_DEFAULT.has(variant) ? 'muted' : 'default');
  return <Component className={cx(styles[variant], styles[resolvedTone], className)} {...rest} />;
}
