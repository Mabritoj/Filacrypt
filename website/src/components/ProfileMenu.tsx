import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { useDismissablePanel } from '../hooks/useDismissablePanel';
import { useThemeStore } from '../stores/themeStore';
import { useUpdateUserPreferences } from '../api/user';
import { useWorkspace } from '../api/workspace';
import { useWorkspaceId } from '../hooks/useWorkspaceId';
import styles from './ProfileMenu.module.css';

export interface ProfileMenuProps {
  name?: string;
  email?: string;
}

export function ProfileMenu({ name = 'Maker', email = 'you@filacrypt.com' }: ProfileMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const updatePreferences = useUpdateUserPreferences();
  const rootRef = useDismissablePanel<HTMLDivElement>(open, () => setOpen(false));

  const workspaceId = useWorkspaceId();
  const { data: workspace } = useWorkspace(workspaceId ?? '');

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    updatePreferences.mutate({ theme: newTheme });
  };

  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.avatar}
        onClick={() => setOpen((value) => !value)}
        aria-label="Open profile menu"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.header}>
            <div className={styles.name}>{name}</div>
            <div className={styles.emailRow}>
              <span className={styles.email}>{email}</span>
              <Link
                to="/account"
                className={styles.settingsButton}
                aria-label="Account settings"
                onClick={() => setOpen(false)}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx={12} cy={12} r={3} stroke="currentColor" strokeWidth={2} />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {workspace && (
            <div className={styles.group}>
              <div className={styles.workspaceRow}>
                <span className={styles.workspaceName} data-testid="workspace-name">
                  {workspace.name}
                </span>
                <button
                  type="button"
                  className={styles.switchWorkspaceButton}
                  aria-label="Switch workspace"
                  onClick={() => {}}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M7 7h11l-3-3"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M17 17H6l3 3"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className={styles.group}>
            <Link to="/scan" className={styles.item} role="menuitem" onClick={() => setOpen(false)}>
              Add Spool
            </Link>
            <button
              type="button"
              className={styles.item}
              role="menuitemcheckbox"
              aria-checked={theme === 'dark'}
              onClick={handleThemeToggle}
            >
              <span>Dark mode</span>
              <span className={styles.switch} data-on={theme === 'dark'}>
                <span className={styles.switchKnob} />
              </span>
            </button>
          </div>

          <div className={styles.group}>
            <button
              type="button"
              className={`${styles.item} ${styles.danger}`}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut()
                  .then(() => navigate('/'))
                  .catch((err: unknown) => {
                    console.error('signOut failed', err);
                  });
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
