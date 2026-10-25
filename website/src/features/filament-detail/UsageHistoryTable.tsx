import type { UsageEvent } from '../../api/types';
import { useId } from 'react';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import { formatDate, formatDuration } from '../../utils/format';
import styles from './UsageHistoryTable.module.css';

export interface UsageHistoryTableProps {
  events: UsageEvent[];
}

export function UsageHistoryTable({ events }: UsageHistoryTableProps) {
  const titleId = useId();
  const totalUsedG = events.reduce((sum, event) => sum + event.usedWeightG, 0);

  return (
    <Card as="section">
      <div className={styles.header}>
        <Text variant="eyebrow" as="h2" id={titleId}>
          Usage history
        </Text>
        {events.length > 0 && (
          <Text variant="meta">
            {totalUsedG} g used across {events.length} print{events.length === 1 ? '' : 's'}
          </Text>
        )}
      </div>

      {events.length === 0 ? (
        <Text variant="bodySm" tone="muted" className={styles.empty}>
          No print jobs logged for this spool yet.
        </Text>
      ) : (
        // ARIA table roles rather than <table>: the rows are CSS grids, and
        // restyling real table elements can strip their semantics in Safari.
        <div role="table" aria-labelledby={titleId}>
          <div role="rowgroup">
            <div role="row" className={`${styles.gridRow} ${styles.headRow}`}>
              <Text variant="label" role="columnheader">
                Date
              </Text>
              <Text variant="label" role="columnheader">
                Print job
              </Text>
              <Text variant="label" role="columnheader" className={styles.right}>
                Filament
              </Text>
              <Text variant="label" role="columnheader" className={styles.right}>
                Duration
              </Text>
            </div>
          </div>
          <div role="rowgroup">
            {events.map((event, index) => (
              <div
                key={event.id}
                role="row"
                className={styles.gridRow}
                data-alt={index % 2 === 1 ? 'true' : undefined}
              >
                <span role="cell" className={styles.date}>
                  {formatDate(event.occurredAt)}
                </span>
                <span role="cell" className={styles.name}>
                  {event.printJobName}
                </span>
                <span role="cell" className={`${styles.used} ${styles.right}`}>
                  {event.usedWeightG} g
                </span>
                <span role="cell" className={`${styles.date} ${styles.right}`}>
                  {formatDuration(event.durationMin)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
