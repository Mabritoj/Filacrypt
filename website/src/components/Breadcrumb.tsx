import { Link } from 'react-router-dom';
import styles from './Breadcrumb.module.css';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const parentItem = [...items]
    .slice(0, -1)
    .reverse()
    .find((item) => item.to);

  return (
    <>
      {parentItem && (
        <Link
          to={parentItem.to as string}
          className={styles.mobileBack}
          aria-label={`Back to ${parentItem.label}`}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span
            key={item.label}
            className={isLast ? styles.segment : `${styles.segment} ${styles.hidable}`}
          >
            <span className={isLast ? `${styles.sep} ${styles.sepLast}` : styles.sep}>/</span>
            {item.to && !isLast ? (
              <Link to={item.to} className={styles.link}>
                {item.label}
              </Link>
            ) : (
              <span className={styles.current}>{item.label}</span>
            )}
          </span>
        );
      })}
    </>
  );
}
