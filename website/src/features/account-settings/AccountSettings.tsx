import { useEffect, useState, type ReactNode } from 'react';
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
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { NumberInput } from '../../components/NumberInput';
import { ErrorMessage } from '../../components/ErrorMessage';
import { LoadingSpool } from '../../components/LoadingSpool';
import { PageShell } from '../../components/PageShell';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TabPanel, Tabs } from '../../components/Tabs';
import { Text } from '../../components/Text';
import { TextInput } from '../../components/TextInput';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { DeletionImpactModal } from './DeletionImpactModal';
import { MembersSection } from './MembersSection';
import { SettingsCard } from './SettingsCard';
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
  const [activeTab, setActiveTab] = useState<'general' | 'members'>('general');

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

      <Text variant="h1">Account settings</Text>
      <Text tone="muted" className={styles.subtitle}>
        Manage your profile and printing preferences.
      </Text>

      <Tabs
        id="account-settings"
        tabs={[
          { id: 'general', label: 'General' },
          { id: 'members', label: 'Members' },
        ]}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as 'general' | 'members')}
      />

      {activeTab === 'general' && (
        <TabPanel tabsId="account-settings" tabId="general">
          <SettingsCard title="Profile">
            <div className={styles.avatarRow}>
              <div className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
            </div>
            <div className={styles.grid}>
              <ReadOnlyField label="Name">{user.name}</ReadOnlyField>
              <ReadOnlyField label="Username">{user.username}</ReadOnlyField>
              <ReadOnlyField label="Email" wide>
                <span className={styles.value}>{user.email}</span>
                {user.emailVerified && (
                  <Badge tone="success" size="sm">
                    ✓ Verified
                  </Badge>
                )}
              </ReadOnlyField>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Units & display"
            description="How measurements and value appear throughout Filacrypt."
          >
            <div className={styles.grid}>
              <SegmentedControl
                label="Weight unit"
                value={preferences.weightUnit}
                onChange={(weightUnit) => setPreferences({ ...preferences, weightUnit })}
                options={[
                  { value: 'g', label: 'Grams' },
                  { value: 'kg', label: 'Kilograms' },
                ]}
              />
              <SegmentedControl
                label="Temperature"
                value={preferences.temperatureUnit}
                onChange={(temperatureUnit) => setPreferences({ ...preferences, temperatureUnit })}
                options={[
                  { value: 'C', label: '°C' },
                  { value: 'F', label: '°F' },
                ]}
              />
              <SegmentedControl
                label="Length"
                value={preferences.lengthUnit}
                onChange={(lengthUnit) => setPreferences({ ...preferences, lengthUnit })}
                options={[
                  { value: 'm', label: 'Meters' },
                  { value: 'ft', label: 'Feet' },
                ]}
              />
              <SegmentedControl
                label="Currency"
                value={preferences.currency}
                onChange={(currency) => setPreferences({ ...preferences, currency })}
                options={[
                  { value: 'USD', label: 'USD $' },
                  { value: 'EUR', label: 'EUR €' },
                  { value: 'GBP', label: 'GBP £' },
                ]}
              />
              <SegmentedControl
                label="Theme"
                value={preferences.theme}
                onChange={(theme) => setPreferences({ ...preferences, theme })}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
              />
              <SegmentedControl
                label="Default spool entry"
                value={preferences.defaultEntryMode}
                onChange={(defaultEntryMode) =>
                  setPreferences({ ...preferences, defaultEntryMode })
                }
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
              <Field label="Low-stock alert below">
                <NumberInput
                  unit="grams"
                  value={inventoryDefaults.lowStockThresholdG}
                  onChange={(event) =>
                    setInventoryDefaults({
                      ...inventoryDefaults,
                      lowStockThresholdG: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Default diameter">
                <NumberInput
                  unit="mm"
                  step={0.05}
                  value={inventoryDefaults.defaultDiameterMm}
                  onChange={(event) =>
                    setInventoryDefaults({
                      ...inventoryDefaults,
                      defaultDiameterMm: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Default empty spool weight">
                <NumberInput
                  unit="grams"
                  value={inventoryDefaults.defaultEmptySpoolWeightG}
                  onChange={(event) =>
                    setInventoryDefaults({
                      ...inventoryDefaults,
                      defaultEmptySpoolWeightG: Number(event.target.value),
                    })
                  }
                />
              </Field>
            </div>
          </SettingsCard>

          {(updatePreferences.isError || updateWorkspace.isError) && (
            <ErrorMessage
              message={
                (updatePreferences.error ?? updateWorkspace.error)?.message ??
                'Something went wrong.'
              }
            />
          )}
          <div className={styles.saveBar}>
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isSaving}>
              {isSaving ? 'Saving…' : justSaved ? 'Saved' : 'Save changes'}
            </Button>
          </div>

          <Card as="section" tone="destructive" padding="lg" className={styles.dangerCard}>
            <div>
              <Text variant="title" as="h2" tone="destructive">
                Delete account
              </Text>
              <Text variant="meta" as="p" className={styles.dangerMeta}>
                Permanently removes your account and all data associated with it.
              </Text>
            </div>
            <Button
              variant="destructive"
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
          </Card>

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
            <ConfirmDialog
              title="Delete your account?"
              confirmLabel="Delete"
              pendingLabel="Deleting…"
              pending={deleteAccount.isPending}
              confirmDisabled={!canConfirmDelete}
              error={deleteAccount.error?.message}
              onConfirm={handleDeleteConfirm}
              onCancel={() => setConfirmingDelete(false)}
            >
              <p>
                This can&apos;t be undone. Type <strong>{user.email}</strong> to confirm.
              </p>
              <Field label="Confirm email address">
                <TextInput
                  value={deleteConfirmEmail}
                  onChange={(event) => setDeleteConfirmEmail(event.target.value)}
                  autoComplete="off"
                />
              </Field>
            </ConfirmDialog>
          )}
        </TabPanel>
      )}

      {activeTab === 'members' && (
        <TabPanel tabsId="account-settings" tabId="members">
          <MembersSection
            workspaceId={workspaceId ?? ''}
            callerRole={workspaceQuery.data?.callerRole ?? 'member'}
          />
        </TabPanel>
      )}
    </PageShell>
  );
}

interface ReadOnlyFieldProps {
  label: string;
  /** Span both grid columns. */
  wide?: boolean;
  children: ReactNode;
}

/** A labelled value styled like a disabled input -- profile details aren't editable here. */
function ReadOnlyField({ label, wide, children }: ReadOnlyFieldProps) {
  return (
    <div className={wide ? `${styles.readOnly} ${styles.wide}` : styles.readOnly}>
      <Text variant="eyebrow" className={styles.readOnlyLabel}>
        {label}
      </Text>
      <div className={styles.readOnlyValue}>{children}</div>
    </div>
  );
}
