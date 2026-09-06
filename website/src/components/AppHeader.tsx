import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../api/user';
import { ProfileMenu } from './ProfileMenu';
import styles from './AppHeader.module.css';

export interface AppHeaderProps {
  breadcrumb?: ReactNode;
  actions?: ReactNode;
}

export function AppHeader({ breadcrumb, actions }: AppHeaderProps) {
  const { data: user } = useUser();

  return (
    <header className={styles.topBar}>
      <div className={breadcrumb ? `${styles.left} ${styles.hasBreadcrumb}` : styles.left}>
        <Link to="/" className={styles.brandLink}>
          <div className={styles.brandMark}>F</div>
          <span className={styles.brandName}>Filacrypt</span>
        </Link>
        {breadcrumb}
      </div>
      <div className={styles.right}>
        {actions}
        <ProfileMenu name={user?.name} email={user?.email} />
      </div>
    </header>
  );
}
