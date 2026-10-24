import type { ReactNode } from 'react';
import { Card } from '../../components/Card';
import { Text } from '../../components/Text';
import styles from './SettingsCard.module.css';

export interface SettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** One titled section of the settings page. */
export function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <Card as="section" padding="lg" className={styles.card}>
      <div className={styles.header}>
        <Text variant="title" as="h2">
          {title}
        </Text>
        {description && (
          <Text variant="meta" as="p">
            {description}
          </Text>
        )}
      </div>
      {children}
    </Card>
  );
}
