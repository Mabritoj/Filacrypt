import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { useDismissablePanel } from '../hooks/useDismissablePanel';
import { useThemeStore } from '../stores/themeStore';
import { useUpdateUserPreferences } from '../api/user';
import { useWorkspace } from '../api/workspace';
import { useWorkspaceId } from '../hooks/useWorkspaceId';
import { IconButton } from './IconButton';
import { GearIcon, SwapIcon } from './icons';
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
              <IconButton
                to="/account"
                label="Account settings"
                size="sm"
                icon={<GearIcon size={14} />}
                onClick={() => setOpen(false)}
              />
            </div>
          </div>

          {workspace && (
            <div className={styles.group}>
              <div className={styles.workspaceRow}>
                <span className={styles.workspaceName} data-testid="workspace-name">
                  {workspace.name}
                </span>
                <IconButton
                  label="Switch workspace"
                  size="sm"
                  icon={<SwapIcon size={14} />}
                  onClick={() => {}}
                />
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
