import type { ComponentPropsWithRef, ElementType } from 'react';

/**
 * Props for a component whose rendered element only changes the tag, e.g.
 * `<Card as="section">` or `<Card as={Link} to="/x">`. The component's own
 * props win over the element's, and the element's props (including `ref`,
 * a regular prop in React 19) are typed from whatever `as` is.
 *
 * Use this for tag-only polymorphism. Components whose element changes their
 * behavior (Button rendering a link vs a button) use a discriminated union
 * instead -- see ActionElement.
 */
export type PolymorphicProps<E extends ElementType, OwnProps = object> = OwnProps & {
  as?: E;
} & Omit<ComponentPropsWithRef<E>, keyof OwnProps | 'as'>;
