import { Link } from 'react-router-dom';
import styles from './ComingSoon.module.css';

export function ComingSoon() {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Coming soon</p>
      <h1 className={styles.title}>This page isn&apos;t built yet.</h1>
      <Link className={styles.link} to="/">
        Back to Filacrypt
      </Link>
    </div>
  );
}
