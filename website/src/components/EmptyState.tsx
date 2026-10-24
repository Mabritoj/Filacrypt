import type { ReactNode } from 'react';
import { cx } from '../utils/cx';
import { Text } from './Text';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** Small caps line above the title, e.g. "Coming soon". */
  eyebrow?: string;
  title: string;
  /** One or two sentences of explanation. */
  children?: ReactNode;
  /** Usually a Button link to somewhere useful. */
  action?: ReactNode;
  /** Heading level for the title -- h1 when it's the whole page. */
  titleAs?: 'h1' | 'h2' | 'p';
  className?: string;
}

/** A centered message for "nothing here": not found, no results, not built yet. */
export function EmptyState({
  eyebrow,
  title,
  children,
  action,
  titleAs = 'h2',
  className,
}: EmptyStateProps) {
  return (
    <div className={cx(styles.emptyState, className)}>
      {eyebrow && (
        <Text variant="eyebrow" tone="brand" as="p">
          {eyebrow}
        </Text>
      )}
      <Text variant={titleAs === 'h1' ? 'h1' : 'h2'} as={titleAs}>
        {title}
      </Text>
      {children && <Text tone="muted">{children}</Text>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
