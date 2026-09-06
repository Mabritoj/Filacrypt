import styles from './LoadingSpool.module.css';
import spinStyles from './spoolSpin.module.css';

export interface LoadingSpoolProps {
  message: string;
}

export function LoadingSpool({ message }: LoadingSpoolProps) {
  return (
    <div className={styles.wrap}>
      <svg
        className={`${styles.icon} ${spinStyles.spin}`}
        width={180}
        height={180}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx={12} cy={12} r={10} stroke="var(--color-border-strong)" strokeWidth={1} />
        <circle
          cx={12}
          cy={12}
          r={8.5}
          stroke="var(--color-brand)"
          strokeOpacity={0.9}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeDasharray="3 2"
        />
        <circle
          cx={12}
          cy={12}
          r={7}
          stroke="var(--color-brand)"
          strokeOpacity={0.7}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeDasharray="3 2"
          strokeDashoffset={1.5}
        />
        <circle
          cx={12}
          cy={12}
          r={5.5}
          stroke="var(--color-brand)"
          strokeOpacity={0.5}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeDasharray="2.5 2"
          strokeDashoffset={0.8}
        />
        <circle
          cx={12}
          cy={12}
          r={4}
          stroke="var(--color-brand)"
          strokeOpacity={0.35}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeDasharray="2 1.5"
          strokeDashoffset={1.2}
        />
        <circle cx={12} cy={12} r={2} fill="var(--color-brand)" />
      </svg>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
