import styles from './Pagination.module.css';

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Names the navigation landmark, e.g. "Inventory pages". */
  label?: string;
  className?: string;
}

/** Numbered page buttons. Renders nothing when there's only one page. */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  label = 'Pages',
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav aria-label={label} className={className}>
      <ul className={styles.list}>
        {pages.map((number) => (
          <li key={number}>
            <button
              type="button"
              className={styles.page}
              aria-current={number === page ? 'page' : undefined}
              aria-label={`Page ${number}`}
              onClick={() => onPageChange(number)}
            >
              {number}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
