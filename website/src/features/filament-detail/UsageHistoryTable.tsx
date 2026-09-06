import type { UsageEvent } from '../../api/types';
import styles from './UsageHistoryTable.module.css';

export interface UsageHistoryTableProps {
  events: UsageEvent[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(minutes?: number): string {
  if (!minutes) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

export function UsageHistoryTable({ events }: UsageHistoryTableProps) {
  const totalUsedG = events.reduce((sum, event) => sum + event.usedWeightG, 0);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>USAGE HISTORY</div>
        {events.length > 0 && (
          <div className={styles.summary}>
            {totalUsedG} g used across {events.length} print{events.length === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <p className={styles.empty}>No print jobs logged for this spool yet.</p>
      ) : (
        <>
          <div className={`${styles.gridRow} ${styles.headRow}`}>
            <span>DATE</span>
            <span>PRINT JOB</span>
            <span className={styles.right}>FILAMENT</span>
            <span className={styles.right}>DURATION</span>
          </div>
          {events.map((event, index) => (
            <div
              key={event.id}
              className={styles.gridRow}
              data-alt={index % 2 === 1 ? 'true' : undefined}
            >
              <span className={styles.date}>{formatDate(event.occurredAt)}</span>
              <span className={styles.name}>{event.printJobName}</span>
              <span className={`${styles.used} ${styles.right}`}>{event.usedWeightG} g</span>
              <span className={`${styles.date} ${styles.right}`}>
                {formatDuration(event.durationMin)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
