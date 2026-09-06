import type { ReactNode } from 'react';
import styles from './PageShell.module.css';

export interface PageShellProps {
  children: ReactNode;
  /** Center the content and style it as a status message (loading, empty, not-found, ...). */
  centered?: boolean;
  /** Rendered above the centered content, outside the centering wrapper (e.g. AppHeader during a loading state). */
  header?: ReactNode;
}

export function PageShell({ children, centered, header }: PageShellProps) {
  return (
    <div className={centered ? `${styles.page} ${styles.pageCentered}` : styles.page}>
      <div className={`app-container ${styles.container}`}>
        {header}
        {centered ? <div className={styles.centered}>{children}</div> : children}
      </div>
    </div>
  );
}
