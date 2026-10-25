import { useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { useThemeStore } from '../stores/themeStore';
import { useUpdateUserPreferences } from '../api/user';
import { useWorkspace } from '../api/workspace';
import { useWorkspaceId } from '../hooks/useWorkspaceId';
import { IconButton } from './IconButton';
import { Menu, MenuGroup, MenuItem } from './Menu';
import { SwitchIndicator } from './Switch';
import { GearIcon, SwapIcon } from './icons';
import styles from './ProfileMenu.module.css';

export interface ProfileMenuProps {
  name?: string;
  email?: string;
}

export function ProfileMenu({ name = 'Maker', email = 'you@filacrypt.com' }: ProfileMenuProps) {
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const updatePreferences = useUpdateUserPreferences();

  const workspaceId = useWorkspaceId();
  const { data: workspace } = useWorkspace(workspaceId ?? '');

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    updatePreferences.mutate({ theme: newTheme });
  };

  const handleSignOut = () => {
    signOut()
      .then(() => navigate('/'))
      .catch((err: unknown) => {
        console.error('signOut failed', err);
      });
  };

  const initial = name.charAt(0).toUpperCase();

  return (
    <Menu
      label="Profile"
      className={styles.panel}
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          type="button"
          className={styles.avatar}
          aria-label="Open profile menu"
        >
          {initial}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className={styles.header}>
            <div className={styles.name}>{name}</div>
            <div className={styles.emailRow}>
              <span className={styles.email}>{email}</span>
              <IconButton
                to="/account"
                label="Account settings"
                size="sm"
                icon={<GearIcon size={14} />}
                tabIndex={-1}
                onClick={close}
              />
            </div>
          </div>

          {workspace && (
            <MenuGroup>
              <div className={styles.workspaceRow}>
                <span className={styles.workspaceName} data-testid="workspace-name">
                  {workspace.name}
                </span>
                <IconButton
                  label="Switch workspace"
                  size="sm"
                  icon={<SwapIcon size={14} />}
                  tabIndex={-1}
                  onClick={() => {}}
                />
              </div>
            </MenuGroup>
          )}

          <MenuGroup>
            <MenuItem to="/scan">Add Spool</MenuItem>
            <MenuItem checked={theme === 'dark'} onClick={handleThemeToggle}>
              <span>Dark mode</span>
              <SwitchIndicator on={theme === 'dark'} />
            </MenuItem>
          </MenuGroup>

          <MenuGroup>
            <MenuItem tone="destructive" onClick={handleSignOut}>
              Sign out
            </MenuItem>
          </MenuGroup>
        </>
      )}
    </Menu>
  );
}
