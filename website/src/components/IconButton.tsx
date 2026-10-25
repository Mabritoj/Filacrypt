import type { ReactNode } from 'react';
import { cx } from '../utils/cx';
import { ActionElement, type ActionProps } from './ActionElement';
import styles from './IconButton.module.css';

interface IconButtonOwnProps {
  /** Accessible name -- required, since the control has no visible text. */
  label: string;
  /** Usually one of `./icons`, sized to fit (14px for sm, 16-18px for md). */
  icon: ReactNode;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'outline';
  className?: string;
}

/** A square, icon-only control. Like Button, `to`/`href` render a link. */
export type IconButtonProps = ActionProps<IconButtonOwnProps>;

export function IconButton({
  label,
  icon,
  size = 'md',
  variant = 'ghost',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <ActionElement
      {...rest}
      aria-label={label}
      className={cx(styles.iconButton, styles[size], styles[variant], className)}
    >
      {icon}
    </ActionElement>
  );
}
