import styles from './ErrorMessage.module.css';

export interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return <p className={styles.error}>{message}</p>;
}
