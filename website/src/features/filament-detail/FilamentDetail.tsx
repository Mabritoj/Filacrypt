import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSpool, useUpdateSpool, useDeleteSpool } from '../../api/spools';
import { useUsageEvents } from '../../api/usageEvents';
import { usePreferences } from '../../api/user';
import { useWorkspace } from '../../api/workspace';
import { MATERIAL_TAGS, MATERIAL_TYPES } from '../../api/types';
import type { Spool } from '../../api/types';
import { AppHeader } from '../../components/AppHeader';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ErrorMessage } from '../../components/ErrorMessage';
import { IconButton } from '../../components/IconButton';
import { MoreIcon, NfcIcon } from '../../components/icons';
import { Menu, MenuGroup, MenuItem } from '../../components/Menu';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { ColorInput } from '../../components/ColorInput';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LoadingSpool } from '../../components/LoadingSpool';
import { NumberInput } from '../../components/NumberInput';
import { PageShell } from '../../components/PageShell';
import { ProgressBar } from '../../components/ProgressBar';
import { Select } from '../../components/Select';
import { Stat } from '../../components/Stat';
import { Text } from '../../components/Text';
import { TextInput } from '../../components/TextInput';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { formatCurrency, formatLength, formatTemperature, formatWeight } from '../../utils/units';
import { canFilament } from '../../utils/permissions';
import { DetailCard } from './DetailCard';
import { SpoolVisualization } from './SpoolVisualization';
import { UsageHistoryTable } from './UsageHistoryTable';
import styles from './FilamentDetail.module.css';
import { formatDate, formatRelativeTime, humanizeEnum } from '../../utils/format';

const SPOOL_STATUSES: Spool['status'][] = ['in_use', 'stored', 'empty', 'archived'];

const EDITABLE_KEYS: (keyof Spool)[] = [
  'brand',
  'materialType',
  'materialName',
  'tags',
  'colorHex',
  'remainingWeightG',
  'emptyContainerWeightG',
  'filamentDiameterMm',
  'densityGCm3',
  'totalLengthMm',
  'minNozzleTempC',
  'maxNozzleTempC',
  'minBedTempC',
  'idealChamberTempC',
  'maxVolumetricFlowMm3s',
  'partCoolingFanPct',
  'dryingTempC',
  'dryingTimeMin',
  'purchasePriceCents',
  'vendor',
  'purchasedAt',
  'storageLocation',
  'status',
  'openedAt',
  'batchLot',
  'serial',
  'manufacturedAt',
  'materialUuid',
];

function diffSpool(original: Spool, draft: Spool): Partial<Spool> {
  const diff: Partial<Spool> = {};
  for (const key of EDITABLE_KEYS) {
    const before = original[key];
    const after = draft[key];
    const changed =
      Array.isArray(before) || Array.isArray(after)
        ? JSON.stringify(before) !== JSON.stringify(after)
        : before !== after;
    if (changed) {
      (diff as Record<string, unknown>)[key] = after;
    }
  }
  return diff;
}

export function FilamentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const preferences = usePreferences();
  const spoolQuery = useSpool(workspaceId ?? '', id);
  const usageQuery = useUsageEvents(workspaceId ?? '', id);
  const updateSpool = useUpdateSpool(workspaceId ?? '');
  const deleteSpool = useDeleteSpool(workspaceId ?? '');
  const workspaceQuery = useWorkspace(workspaceId ?? '');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Spool | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const spool = spoolQuery.data;
  const workspace = workspaceQuery.data;
  const canEditSpool = canFilament(workspace, 'update');
  const canDeleteSpool = canFilament(workspace, 'delete');

  if (spoolQuery.isPending || usageQuery.isPending || workspaceQuery.isPending) {
    return (
      <PageShell centered header={<AppHeader />}>
        <LoadingSpool message="Loading spool…" />
      </PageShell>
    );
  }

  if (spoolQuery.isError || usageQuery.isError || workspaceQuery.isError) {
    return (
      <PageShell centered>
        <ErrorMessage message="Something went wrong loading this spool." />
        <Button to="/inventory" variant="secondary">
          Back to inventory
        </Button>
      </PageShell>
    );
  }

  if (!spool) {
    return (
      <PageShell centered>
        <EmptyState
          title="Spool not found."
          titleAs="h1"
          action={
            <Button to="/inventory" variant="secondary">
              Back to inventory
            </Button>
          }
        >
          It may have been deleted, or the link is wrong.
        </EmptyState>
      </PageShell>
    );
  }

  const currentSpool: Spool = spool;
  const view = editing && draft ? draft : currentSpool;

  function updateDraft<K extends keyof Spool>(key: K, value: Spool[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function textField(ariaLabel: string, key: keyof Spool) {
    return (
      <TextInput
        size="sm"
        aria-label={ariaLabel}
        value={(draft?.[key] as string | undefined) ?? ''}
        onChange={(event) => updateDraft(key, event.target.value as Spool[typeof key])}
      />
    );
  }

  function numberField(ariaLabel: string, key: keyof Spool) {
    return (
      <NumberInput
        size="sm"
        aria-label={ariaLabel}
        value={(draft?.[key] as number | undefined) ?? ''}
        onChange={(event) => {
          const raw = event.target.value;
          updateDraft(key, (raw === '' ? undefined : Number(raw)) as Spool[typeof key]);
        }}
      />
    );
  }

  function dateField(ariaLabel: string, key: keyof Spool) {
    const raw = draft?.[key] as string | undefined;
    return (
      <TextInput
        type="date"
        size="sm"
        aria-label={ariaLabel}
        value={raw ? raw.slice(0, 10) : ''}
        onChange={(event) => {
          const raw2 = event.target.value;
          updateDraft(key, (raw2 ? new Date(raw2).toISOString() : undefined) as Spool[typeof key]);
        }}
      />
    );
  }

  function startEditing() {
    setDraft(currentSpool);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setDraft(null);
  }

  function saveEditing() {
    if (!draft) return;
    const updates = diffSpool(currentSpool, draft);
    updateSpool.mutate({ id: currentSpool.id, updates }, { onSuccess: () => setEditing(false) });
  }

  function confirmDelete() {
    deleteSpool.mutate(currentSpool.id, { onSuccess: () => navigate('/inventory') });
  }

  const finish = view.tags[0] ? humanizeEnum(view.tags[0]) : undefined;
  const pricePerKgCents =
    view.purchasePriceCents && view.netWeightG
      ? Math.round(view.purchasePriceCents / (view.netWeightG / 1000))
      : undefined;
  const valueRemainingCents =
    view.purchasePriceCents && view.netWeightG
      ? Math.round((view.purchasePriceCents * view.remainingWeightG) / view.netWeightG)
      : undefined;

  const breadcrumb = (
    <Breadcrumb items={[{ label: 'Inventory', to: '/inventory' }, { label: spool.materialName }]} />
  );

  const actions = editing ? (
    <>
      <Button variant="secondary" onClick={cancelEditing}>
        Cancel
      </Button>
      <Button onClick={saveEditing} disabled={updateSpool.isPending}>
        {updateSpool.isPending ? 'Saving…' : 'Save'}
      </Button>
    </>
  ) : (
    <>
      <Menu
        label="Spool options"
        trigger={(triggerProps) => (
          <IconButton
            {...triggerProps}
            label="Spool options"
            variant="outline"
            icon={<MoreIcon size={18} />}
          />
        )}
      >
        <MenuGroup>
          <MenuItem>Reorder spool</MenuItem>
          {canEditSpool && <MenuItem onClick={startEditing}>Edit spool</MenuItem>}
          {canDeleteSpool && (
            <MenuItem tone="destructive" onClick={() => setConfirmingDelete(true)}>
              Delete spool
            </MenuItem>
          )}
        </MenuGroup>
      </Menu>
    </>
  );

  return (
    <PageShell>
      <AppHeader breadcrumb={breadcrumb} actions={actions} />

      {updateSpool.isError && <ErrorMessage message={updateSpool.error.message} />}

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this spool?"
          confirmLabel="Delete"
          pendingLabel="Deleting…"
          pending={deleteSpool.isPending}
          error={deleteSpool.error?.message}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        >
          <p>This can&apos;t be undone.</p>
        </ConfirmDialog>
      )}

      <div className={styles.hero}>
        <SpoolVisualization
          colorHex={view.colorHex ?? '#888'}
          remainingWeightG={view.remainingWeightG}
          netWeightG={view.netWeightG}
          totalLengthMm={view.totalLengthMm}
          weightUnit={preferences.weightUnit}
          lengthUnit={preferences.lengthUnit}
        />

        <Card padding="lg" className={styles.identityCard}>
          {editing ? (
            <TextInput
              size="sm"
              aria-label="Brand"
              value={draft?.brand ?? ''}
              onChange={(event) => updateDraft('brand', event.target.value)}
            />
          ) : (
            <Text variant="bodySm" tone="muted" className={styles.brandLabel}>
              {spool.brand}
            </Text>
          )}
          {editing ? (
            <TextInput
              aria-label="Spool name"
              className={styles.editTitleInput}
              value={draft?.materialName ?? ''}
              onChange={(event) => updateDraft('materialName', event.target.value)}
            />
          ) : (
            <Text variant="display">{spool.materialName}</Text>
          )}
          <div className={styles.badges}>
            {editing ? (
              <>
                <Select
                  size="sm"
                  aria-label="Material type"
                  value={draft?.materialType}
                  onChange={(event) =>
                    updateDraft('materialType', event.target.value as Spool['materialType'])
                  }
                >
                  {MATERIAL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
                <Select
                  size="sm"
                  aria-label="Finish"
                  value={draft?.tags[0]}
                  onChange={(event) =>
                    updateDraft('tags', [event.target.value as Spool['tags'][number]])
                  }
                >
                  {MATERIAL_TAGS.map((tag) => (
                    <option key={tag} value={tag}>
                      {humanizeEnum(tag)}
                    </option>
                  ))}
                </Select>
                <ColorInput
                  size="sm"
                  value={draft?.colorHex ?? ''}
                  onChange={(hex) => updateDraft('colorHex', hex)}
                />
              </>
            ) : (
              <>
                <Badge>{spool.materialType}</Badge>
                {finish && <Badge>{finish}</Badge>}
              </>
            )}
          </div>

          <div className={styles.miniStats}>
            <MiniStat
              label="Net weight"
              value={formatWeight(spool.netWeightG, preferences.weightUnit)}
            />
            <MiniStat
              label="Remaining"
              value={formatWeight(view.remainingWeightG, preferences.weightUnit)}
            />
            <MiniStat label="Diameter" value={`${view.filamentDiameterMm} mm`} />
            {view.minNozzleTempC && (
              <MiniStat
                label="Print temp"
                value={formatTemperature(view.minNozzleTempC, preferences.temperatureUnit)}
              />
            )}
          </div>

          {editing && (
            <div className={styles.remainingEditSection}>
              <Text variant="label" as="div" className={styles.remainingEditLabel}>
                Remaining weight
              </Text>
              <input
                type="range"
                min={0}
                max={draft?.netWeightG ?? 0}
                step={10}
                value={draft?.remainingWeightG ?? 0}
                aria-label="Remaining weight"
                onChange={(event) => updateDraft('remainingWeightG', Number(event.target.value))}
              />
              <div className={styles.remainingEditRange}>
                <span>0 g</span>
                <span className={styles.remainingEditValue}>{draft?.remainingWeightG} g</span>
                <span>{draft?.netWeightG} g</span>
              </div>
            </div>
          )}

          <div className={styles.spacer} />
        </Card>
      </div>

      {spool.tag && (
        <Card as="section" tone="accent" padding="lg" className={styles.tagBand}>
          <div className={styles.tagHeader}>
            <div className={styles.tagIcon} aria-hidden="true">
              <NfcIcon size={22} />
            </div>
            <div>
              <div className={styles.tagTitleRow}>
                <Text variant="title" as="h2">
                  NFC tag
                </Text>
                <Badge variant="status" tone={spool.tag.healthy ? 'success' : 'warning'}>
                  {spool.tag.healthy ? 'Healthy' : 'Needs attention'}
                </Badge>
              </div>
              <Text variant="meta" as="div" className={styles.tagStandard}>
                {spool.tag.standard}
              </Text>
            </div>
          </div>
          <div className={styles.tagStats}>
            <Stat size="sm" label="Tag UID" value={spool.tag.uid} />
            <Stat
              size="sm"
              label="Last scanned"
              value={formatRelativeTime(spool.tag.lastScannedAt)}
            />
            <Stat
              size="sm"
              label="Last written"
              value={formatRelativeTime(spool.tag.lastWrittenAt)}
            />
            {spool.tag.memoryUsedBytes !== undefined && spool.tag.memoryTotalBytes && (
              <div>
                <Stat
                  size="sm"
                  label="Memory used"
                  value={`${spool.tag.memoryUsedBytes} / ${spool.tag.memoryTotalBytes} bytes`}
                />
                <ProgressBar
                  size="sm"
                  label="Tag memory used"
                  value={spool.tag.memoryUsedBytes}
                  max={spool.tag.memoryTotalBytes}
                  className={styles.memoryBar}
                />
              </div>
            )}
          </div>
        </Card>
      )}

      <div className={styles.detailGrid}>
        <DetailCard
          title="Print settings"
          rows={[
            editing
              ? {
                  label: 'Nozzle temp',
                  value: (
                    <div className={styles.editRangeInputs}>
                      {numberField('Minimum nozzle temperature', 'minNozzleTempC')}
                      {numberField('Maximum nozzle temperature', 'maxNozzleTempC')}
                    </div>
                  ),
                }
              : view.minNozzleTempC && view.maxNozzleTempC
                ? {
                    label: 'Nozzle temp',
                    value: `${formatTemperature(view.minNozzleTempC, preferences.temperatureUnit)}–${formatTemperature(view.maxNozzleTempC, preferences.temperatureUnit)}`,
                  }
                : undefined,
            editing
              ? { label: 'Bed temp', value: numberField('Bed temperature', 'minBedTempC') }
              : view.minBedTempC
                ? {
                    label: 'Bed temp',
                    value: formatTemperature(view.minBedTempC, preferences.temperatureUnit),
                  }
                : undefined,
            {
              label: 'Chamber temp',
              value: editing
                ? numberField('Ideal chamber temperature', 'idealChamberTempC')
                : view.idealChamberTempC
                  ? formatTemperature(view.idealChamberTempC, preferences.temperatureUnit)
                  : 'Ambient',
            },
            editing
              ? {
                  label: 'Max volumetric flow',
                  value: numberField('Max volumetric flow', 'maxVolumetricFlowMm3s'),
                }
              : view.maxVolumetricFlowMm3s
                ? { label: 'Max volumetric flow', value: `${view.maxVolumetricFlowMm3s} mm³/s` }
                : undefined,
            editing
              ? {
                  label: 'Part cooling fan',
                  value: numberField('Part cooling fan percentage', 'partCoolingFanPct'),
                }
              : view.partCoolingFanPct !== undefined
                ? { label: 'Part cooling fan', value: `${view.partCoolingFanPct} %` }
                : undefined,
          ].filter((row): row is NonNullable<typeof row> => Boolean(row))}
        />

        <DetailCard
          title="Physical"
          rows={[
            {
              label: 'Diameter',
              value: editing
                ? numberField('Diameter (mm)', 'filamentDiameterMm')
                : `${view.filamentDiameterMm} mm`,
            },
            editing
              ? {
                  label: 'Empty spool weight',
                  value: numberField('Empty spool weight (g)', 'emptyContainerWeightG'),
                }
              : view.emptyContainerWeightG
                ? {
                    label: 'Empty spool weight',
                    value: formatWeight(view.emptyContainerWeightG, preferences.weightUnit),
                  }
                : undefined,
            editing
              ? { label: 'Density', value: numberField('Density (g/cm3)', 'densityGCm3') }
              : view.densityGCm3
                ? { label: 'Density', value: `${view.densityGCm3} g/cm³` }
                : undefined,
            editing
              ? {
                  label: 'Total length (mm)',
                  value: numberField('Total length (mm)', 'totalLengthMm'),
                }
              : view.totalLengthMm
                ? {
                    label: 'Total length',
                    value: formatLength(view.totalLengthMm, preferences.lengthUnit),
                  }
                : undefined,
          ].filter((row): row is NonNullable<typeof row> => Boolean(row))}
        />

        {(editing || spool.dryingTempC || spool.dryingTimeMin) && (
          <DetailCard
            title="Drying"
            rows={[
              editing
                ? {
                    label: 'Temperature',
                    value: numberField('Drying temperature (C)', 'dryingTempC'),
                  }
                : view.dryingTempC
                  ? {
                      label: 'Temperature',
                      value: formatTemperature(view.dryingTempC, preferences.temperatureUnit),
                    }
                  : undefined,
              editing
                ? {
                    label: 'Time (min)',
                    value: numberField('Drying time (minutes)', 'dryingTimeMin'),
                  }
                : view.dryingTimeMin
                  ? { label: 'Time', value: `${(view.dryingTimeMin / 60).toFixed(1)} hours` }
                  : undefined,
            ].filter((row): row is NonNullable<typeof row> => Boolean(row))}
          />
        )}

        {(editing || view.purchasePriceCents !== undefined) && (
          <DetailCard
            title="Cost & value"
            rows={[
              editing
                ? {
                    label: 'Purchase price (cents)',
                    value: numberField('Purchase price in cents', 'purchasePriceCents'),
                  }
                : view.purchasePriceCents !== undefined
                  ? {
                      label: 'Purchase price',
                      value: formatCurrency(view.purchasePriceCents, preferences.currency),
                    }
                  : undefined,
              !editing && pricePerKgCents !== undefined
                ? {
                    label: 'Price per kg',
                    value: formatCurrency(pricePerKgCents, preferences.currency),
                  }
                : undefined,
              !editing && valueRemainingCents !== undefined
                ? {
                    label: 'Value remaining',
                    value: formatCurrency(valueRemainingCents, preferences.currency),
                    emphasize: true,
                  }
                : undefined,
              { label: 'Vendor', value: editing ? textField('Vendor', 'vendor') : view.vendor },
              {
                label: 'Purchased',
                value: editing
                  ? dateField('Purchase date', 'purchasedAt')
                  : formatDate(view.purchasedAt),
              },
            ].filter((row): row is NonNullable<typeof row> => Boolean(row))}
          />
        )}

        <DetailCard
          title="Identity & tag"
          rows={[
            { label: 'Brand', value: view.brand },
            {
              label: 'Material · finish',
              value: finish ? `${view.materialType} · ${finish}` : view.materialType,
            },
            {
              label: 'Batch / lot',
              value: editing ? textField('Batch or lot', 'batchLot') : view.batchLot,
            },
            { label: 'Serial', value: editing ? textField('Serial', 'serial') : view.serial },
            {
              label: 'Production date',
              value: editing
                ? dateField('Manufactured date', 'manufacturedAt')
                : formatDate(view.manufacturedAt),
            },
            editing
              ? { label: 'Material UUID', value: textField('Material UUID', 'materialUuid') }
              : view.materialUuid
                ? {
                    label: 'Material UUID',
                    value: `${view.materialUuid.slice(0, 8)}…${view.materialUuid.slice(-4)}`,
                  }
                : undefined,
          ].filter((row): row is NonNullable<typeof row> => Boolean(row))}
        />

        <DetailCard
          title="Storage & assignment"
          rows={[
            {
              label: 'Location',
              value: editing
                ? textField('Storage location', 'storageLocation')
                : view.storageLocation,
            },
            {
              label: 'Status',
              value: editing ? (
                <Select
                  size="sm"
                  aria-label="Status"
                  value={draft?.status}
                  onChange={(event) => updateDraft('status', event.target.value as Spool['status'])}
                >
                  {SPOOL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {humanizeEnum(status)}
                    </option>
                  ))}
                </Select>
              ) : (
                humanizeEnum(view.status)
              ),
              emphasize: !editing && view.status === 'in_use',
            },
            {
              label: 'Opened',
              value: editing ? dateField('Opened date', 'openedAt') : formatDate(view.openedAt),
            },
          ].filter((row): row is NonNullable<typeof row> => Boolean(row))}
        />
      </div>

      <UsageHistoryTable events={usageQuery.data ?? []} />
    </PageShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card tone="sunken" padding="none" className={styles.miniStat}>
      <Stat label={label} value={value} />
    </Card>
  );
}
