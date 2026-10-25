import { cx } from '../utils/cx';
import { SpoolIcon } from './icons';
import styles from './LoadingSpool.module.css';
import spinStyles from './spoolSpin.module.css';

export interface LoadingSpoolProps {
  message: string;
}

export function LoadingSpool({ message }: LoadingSpoolProps) {
  return (
    <div className={styles.wrap}>
      <SpoolIcon size={180} className={cx(styles.icon, spinStyles.spin)} />
      <p className={styles.message}>{message}</p>
    </div>
  );
}
