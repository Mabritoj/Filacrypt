import type { ComponentPropsWithRef, Ref } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type ButtonElementProps = ComponentPropsWithRef<'button'>;
type RouterLinkElementProps = LinkProps & { ref?: Ref<HTMLAnchorElement> };
type AnchorElementProps = ComponentPropsWithRef<'a'>;

/**
 * The three things a clickable control can be, as a discriminated union on
 * its target: `to` renders a router Link, `href` a plain anchor (external or
 * in-page), and neither a `<button type="button">`. Each member keeps its own
 * element's props, so `disabled`/`type` only type-check on the button and
 * `to` and `href` can't be combined.
 *
 * `Own` is the wrapping component's props; `ButtonOnly` are props that only
 * make sense on a real button (e.g. `loading`).
 */
export type ActionProps<Own = object, ButtonOnly = object> =
  | (Own &
      ButtonOnly &
      Omit<ButtonElementProps, keyof Own | keyof ButtonOnly> & { to?: never; href?: never })
  | (Own & Omit<RouterLinkElementProps, keyof Own> & { href?: never })
  | (Own & Omit<AnchorElementProps, keyof Own> & { href: string; to?: never });

/** Renders the element an ActionProps value describes. */
export function ActionElement(props: ActionProps) {
  if (props.to !== undefined) {
    return <Link {...(props as RouterLinkElementProps)} />;
  }
  if (props.href !== undefined) {
    return <a {...(props as AnchorElementProps)} />;
  }
  const { type = 'button', ...rest } = props as ButtonElementProps;
  return <button type={type} {...rest} />;
}
