import type { ReactNode } from 'react';
import styles from './SettingsCard.module.css';

export interface SettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <div className={styles.card}>
      <div className={description ? styles.titleTight : styles.title}>{title}</div>
      {description && <div className={styles.description}>{description}</div>}
      {children}
    </div>
  );
}
