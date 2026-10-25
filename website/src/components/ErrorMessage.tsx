import { Alert } from './Alert';
import styles from './ErrorMessage.module.css';

export interface ErrorMessageProps {
  message: string;
}

/** An error Alert with the bottom spacing forms expect above their actions. */
export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <Alert tone="error" className={styles.spacing}>
      {message}
    </Alert>
  );
}
