import type { ReactNode } from 'react';
import styles from './DetailCard.module.css';

export interface DetailRow {
  label: string;
  value: ReactNode;
  emphasize?: boolean;
}

export interface DetailCardProps {
  title: string;
  rows: DetailRow[];
}

export function DetailCard({ title, rows }: DetailCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{title}</div>
      {rows.map((row) => (
        <div key={row.label} className={styles.row}>
          <span className={styles.label}>{row.label}</span>
          <span className={row.emphasize ? styles.valueEmphasized : styles.value}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}
