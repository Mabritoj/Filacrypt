import type { ReactNode } from 'react';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import styles from './DetailCard.module.css';

export interface DetailRow {
  label: string;
  value: ReactNode;
  emphasize?: boolean;
}

export interface DetailCardProps {
  /** Sentence case -- it's displayed in caps by the eyebrow style. */
  title: string;
  rows: DetailRow[];
}

/** A titled list of label/value pairs. */
export function DetailCard({ title, rows }: DetailCardProps) {
  return (
    <Card as="section">
      <Text variant="eyebrow" as="h2" className={styles.title}>
        {title}
      </Text>
      <dl className={styles.list}>
        {rows.map((row) => (
          <div key={row.label} className={styles.row}>
            <dt className={styles.label}>{row.label}</dt>
            <dd className={row.emphasize ? styles.valueEmphasized : styles.value}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
