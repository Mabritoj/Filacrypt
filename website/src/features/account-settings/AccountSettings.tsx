import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import {
  useDeleteAccount,
  useDeletionImpact,
  useUpdateUserPreferences,
  useUser,
} from '../../api/user';
import type { WorkspaceResolution } from '../../api/user';
import { useUpdateWorkspace, useWorkspace } from '../../api/workspace';
import type { UserPreferences } from '../../api/types';
import { AppHeader } from '../../components/AppHeader';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Button } from '../../components/Button';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Modal } from '../../components/Modal';
import { LoadingSpool } from '../../components/LoadingSpool';
import { PageShell } from '../../components/PageShell';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { DeletionImpactModal } from './DeletionImpactModal';
import { MembersSection } from './MembersSection';
import { SettingsCard } from './SettingsCard';
import { ToggleGroup } from './ToggleGroup';
import styles from './AccountSettings.module.css';

interface InventoryDefaultsForm {
  lowStockThresholdG: number;
  defaultDiameterMm: number;
  defaultEmptySpoolWeightG: number;
}

export function AccountSettings() {
  const navigate = useNavigate();
  const userQuery = useUser();
  const workspaceId = useWorkspaceId();
  const workspaceQuery = useWorkspace(workspaceId ?? '');
  const updatePreferences = useUpdateUserPreferences();
  const updateWorkspace = useUpdateWorkspace(workspaceId ?? '');
  const deleteAccount = useDeleteAccount();
  const deletionImpact = useDeletionImpact();

  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [inventoryDefaults, setInventoryDefaults] = useState<InventoryDefaultsForm | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [resolutions, setResolutions] = useState<Record<string, WorkspaceResolution> | null>(null);
  const [showDeletionImpact, setShowDeletionImpact] = useState(false);

  useEffect(() => {
    if (userQuery.data && !preferences) {
      setPreferences(userQuery.data.preferences);
    }
  }, [userQuery.data, preferences]);

  useEffect(() => {
    if (workspaceQuery.data && !inventoryDefaults) {
      setInventoryDefaults({
        lowStockThresholdG: workspaceQuery.data.lowStockThresholdG,
        defaultDiameterMm: workspaceQuery.data.defaultDiameterMm,
        defaultEmptySpoolWeightG: workspaceQuery.data.defaultEmptySpoolWeightG,
      });
    }
  }, [workspaceQuery.data, inventoryDefaults]);

  function handleCancel() {
    if (userQuery.data) {
      setPreferences(userQuery.data.preferences);
    }
    if (workspaceQuery.data) {
      setInventoryDefaults({
        lowStockThresholdG: workspaceQuery.data.lowStockThresholdG,
        defaultDiameterMm: workspaceQuery.data.defaultDiameterMm,
        defaultEmptySpoolWeightG: workspaceQuery.data.defaultEmptySpoolWeightG,
      });
    }
  }

  async function handleSave() {
    if (!preferences || !inventoryDefaults) return;
    try {
      await Promise.all([
        updatePreferences.mutateAsync(preferences),
        updateWorkspace.mutateAsync(inventoryDefaults),
      ]);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      // Error is already captured in updatePreferences.error / updateWorkspace.error
    }
  }

  function handleDeleteConfirm() {
    deleteAccount.mutate(
      { workspaceResolutions: resolutions ?? {} },
      {
        onSuccess: () => {
          signOut()
            .then(() => navigate('/'))
            .catch((err: unknown) => {
              console.error('signOut failed', err);
            });
        },
      },
    );
  }

  const isLoading = userQuery.isLoading || workspaceQuery.isPending;
  const isSaving = updatePreferences.isPending || updateWorkspace.isPending;
  const canConfirmDelete =
    !!userQuery.data &&
    deleteConfirmEmail.trim().toLowerCase() === userQuery.data.email.trim().toLowerCase();

  if (isLoading || !userQuery.data || !preferences || !inventoryDefaults) {
    return (
      <PageShell
        centered
        header={
          <AppHeader
            breadcrumb={
              <Breadcrumb
                items={[{ label: 'Inventory', to: '/inventory' }, { label: 'Account settings' }]}
              />
            }
          />
        }
      >
        <LoadingSpool message="Loading…" />
      </PageShell>
    );
  }

  const user = userQuery.data;

  return (
    <PageShell>
      <AppHeader
        breadcrumb={
          <Breadcrumb
            items={[{ label: 'Inventory', to: '/inventory' }, { label: 'Account settings' }]}
          />
        }
      />

      <h1 className={styles.title}>Account settings</h1>
      <p className={styles.subtitle}>Manage your profile and printing preferences.</p>

      <SettingsCard title="Profile">
        <div className={styles.avatarRow}>
          <div className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
        </div>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Name</span>
            <div className={styles.disabledField}>{user.name}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Username</span>
            <div className={styles.disabledField}>{user.username}</div>
          </div>
          <div className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.fieldLabel}>Email</span>
            <div className={styles.emailRow}>
              <span>{user.email}</span>
              {user.emailVerified && <span className={styles.verifiedBadge}>✓ VERIFIED</span>}
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Units & display"
        description="How measurements and value appear throughout Filacrypt."
      >
        <div className={styles.grid}>
          <ToggleGroup
            label="WEIGHT UNIT"
            value={preferences.weightUnit}
            onChange={(weightUnit) => setPreferences({ ...preferences, weightUnit })}
            options={[
              { value: 'g', label: 'Grams' },
              { value: 'kg', label: 'Kilograms' },
            ]}
          />
          <ToggleGroup
            label="TEMPERATURE"
            value={preferences.temperatureUnit}
            onChange={(temperatureUnit) => setPreferences({ ...preferences, temperatureUnit })}
            options={[
              { value: 'C', label: '°C' },
              { value: 'F', label: '°F' },
            ]}
          />
          <ToggleGroup
            label="LENGTH"
            value={preferences.lengthUnit}
            onChange={(lengthUnit) => setPreferences({ ...preferences, lengthUnit })}
            options={[
              { value: 'm', label: 'Meters' },
              { value: 'ft', label: 'Feet' },
            ]}
          />
          <ToggleGroup
            label="CURRENCY"
            value={preferences.currency}
            onChange={(currency) => setPreferences({ ...preferences, currency })}
            options={[
              { value: 'USD', label: 'USD $' },
              { value: 'EUR', label: 'EUR €' },
              { value: 'GBP', label: 'GBP £' },
            ]}
          />
          <ToggleGroup
            label="THEME"
            value={preferences.theme}
            onChange={(theme) => setPreferences({ ...preferences, theme })}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
            ]}
          />
          <ToggleGroup
            label="DEFAULT SPOOL ENTRY"
            value={preferences.defaultEntryMode}
            onChange={(defaultEntryMode) => setPreferences({ ...preferences, defaultEntryMode })}
            options={[
              { value: 'nfc', label: 'NFC scan' },
              { value: 'manual', label: 'Manual entry' },
            ]}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Inventory defaults"
        description="Pre-filled when adding spools and used for alerts."
      >
        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Low-stock alert below</span>
            <div className={styles.unitRow}>
              <input
                type="number"
                className={styles.unitInput}
                value={inventoryDefaults.lowStockThresholdG}
                onChange={(event) =>
                  setInventoryDefaults({
                    ...inventoryDefaults,
                    lowStockThresholdG: Number(event.target.value),
                  })
                }
              />
              <span className={styles.unitLabel}>grams</span>
            </div>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Default diameter</span>
            <div className={styles.unitRow}>
              <input
                type="number"
                step={0.05}
                className={styles.unitInput}
                value={inventoryDefaults.defaultDiameterMm}
                onChange={(event) =>
                  setInventoryDefaults({
                    ...inventoryDefaults,
                    defaultDiameterMm: Number(event.target.value),
                  })
                }
              />
              <span className={styles.unitLabel}>mm</span>
            </div>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Default empty spool weight</span>
            <div className={styles.unitRow}>
              <input
                type="number"
                className={styles.unitInput}
                value={inventoryDefaults.defaultEmptySpoolWeightG}
                onChange={(event) =>
                  setInventoryDefaults({
                    ...inventoryDefaults,
                    defaultEmptySpoolWeightG: Number(event.target.value),
                  })
                }
              />
              <span className={styles.unitLabel}>grams</span>
            </div>
          </label>
        </div>
      </SettingsCard>

      {(updatePreferences.isError || updateWorkspace.isError) && (
        <ErrorMessage
          message={
            (updatePreferences.error ?? updateWorkspace.error)?.message ?? 'Something went wrong.'
          }
        />
      )}
      <div className={styles.saveBar}>
        <Button variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : justSaved ? 'Saved' : 'Save changes'}
        </Button>
      </div>

      <MembersSection
        workspaceId={workspaceId ?? ''}
        callerRole={workspaceQuery.data?.callerRole ?? 'member'}
      />

      <div className={styles.dangerCard}>
        <div>
          <div className={styles.dangerTitle}>Delete account</div>
          <div className={styles.dangerMeta}>
            Permanently removes your account and all data associated with it.
          </div>
        </div>
        <Button
          variant="danger"
          onClick={() => {
            setDeleteConfirmEmail('');
            if (deletionImpact.data && deletionImpact.data.length > 0) {
              setResolutions(null);
              setShowDeletionImpact(true); // opens the DeletionImpactModal below, not the email-confirm modal yet
            } else {
              setConfirmingDelete(true);
            }
          }}
        >
          Delete account
        </Button>
      </div>

      {showDeletionImpact && deletionImpact.data && deletionImpact.data.length > 0 && (
        <DeletionImpactModal
          workspaces={deletionImpact.data}
          onResolved={(chosen) => {
            setResolutions(chosen);
            setShowDeletionImpact(false);
            setConfirmingDelete(true);
          }}
          onCancel={() => setShowDeletionImpact(false)}
        />
      )}

      {confirmingDelete && (
        <Modal title="Delete your account?" onCancel={() => setConfirmingDelete(false)}>
          <p>
            This can&apos;t be undone. Type <strong>{user.email}</strong> to confirm.
          </p>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Confirm email address</span>
            <input
              className={styles.input}
              value={deleteConfirmEmail}
              onChange={(event) => setDeleteConfirmEmail(event.target.value)}
            />
          </label>
          {deleteAccount.isError && <ErrorMessage message={deleteAccount.error.message} />}
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={!canConfirmDelete || deleteAccount.isPending}
            >
              {deleteAccount.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}
