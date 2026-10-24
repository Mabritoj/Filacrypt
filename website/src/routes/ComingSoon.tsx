import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import styles from './ComingSoon.module.css';

export function ComingSoon() {
  return (
    <main className={styles.page}>
      <EmptyState
        eyebrow="Coming soon"
        title="This page isn't built yet."
        titleAs="h1"
        action={
          <Button to="/" variant="secondary">
            Back to Filacrypt
          </Button>
        }
      />
    </main>
  );
}
