import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSpool, useUpdateSpool, useDeleteSpool } from '../../api/spools';
import { useUsageEvents } from '../../api/usageEvents';
import { usePreferences } from '../../api/user';
import { useWorkspace } from '../../api/workspace';
import { MATERIAL_TAGS, MATERIAL_TYPES } from '../../api/types';
import type { Spool } from '../../api/types';
import { AppHeader } from '../../components/AppHeader';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Button } from '../../components/Button';
import { ErrorMessage } from '../../components/ErrorMessage';
import { Modal } from '../../components/Modal';
import { LoadingSpool } from '../../components/LoadingSpool';
import { PageShell } from '../../components/PageShell';
import { useDismissablePanel } from '../../hooks/useDismissablePanel';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { formatCurrency, formatLength, formatTemperature, formatWeight } from '../../utils/units';
import { canFilament } from '../../utils/permissions';
import { DetailCard } from './DetailCard';
import { SpoolVisualization } from './SpoolVisualization';
import { UsageHistoryTable } from './UsageHistoryTable';
import styles from './FilamentDetail.module.css';

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

function formatTag(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(iso?: string): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
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

  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useDismissablePanel<HTMLDivElement>(optionsOpen, () => setOptionsOpen(false));
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
        <Link to="/inventory" className={styles.backLink}>
          Back to inventory
        </Link>
      </PageShell>
    );
  }

  if (!spool) {
    return (
      <PageShell centered>
        <p>Spool not found.</p>
        <Link to="/inventory" className={styles.backLink}>
          Back to inventory
        </Link>
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
      <input
        aria-label={ariaLabel}
        className={styles.editInput}
        value={(draft?.[key] as string | undefined) ?? ''}
        onChange={(event) => updateDraft(key, event.target.value as Spool[typeof key])}
      />
    );
  }

  function numberField(ariaLabel: string, key: keyof Spool) {
    return (
      <input
        type="number"
        aria-label={ariaLabel}
        className={styles.editInput}
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
      <input
        type="date"
        aria-label={ariaLabel}
        className={styles.editInput}
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
    setOptionsOpen(false);
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

  const finish = view.tags[0] ? formatTag(view.tags[0]) : undefined;
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
      <div className={styles.optionsWrap} ref={optionsRef}>
        <button
          type="button"
          className={styles.optionsButton}
          aria-label="Spool options"
          aria-expanded={optionsOpen}
          onClick={() => setOptionsOpen((value) => !value)}
        >
          ⋮
        </button>
        {optionsOpen && (
          <div className={styles.optionsMenu} role="menu">
            <button
              type="button"
              className={styles.optionsItem}
              role="menuitem"
              onClick={() => setOptionsOpen(false)}
            >
              Reorder spool
            </button>
            {canEditSpool && (
              <button
                type="button"
                className={styles.optionsItem}
                role="menuitem"
                onClick={startEditing}
              >
                Edit spool
              </button>
            )}
            {canDeleteSpool && (
              <button
                type="button"
                className={`${styles.optionsItem} ${styles.destructive}`}
                role="menuitem"
                onClick={() => {
                  setConfirmingDelete(true);
                  setOptionsOpen(false);
                }}
              >
                Delete spool
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <PageShell>
      <AppHeader breadcrumb={breadcrumb} actions={actions} />

      {updateSpool.isError && <ErrorMessage message={updateSpool.error.message} />}

      {confirmingDelete && (
        <Modal title="Delete this spool?" onCancel={() => setConfirmingDelete(false)}>
          <p>This can&apos;t be undone.</p>
          {deleteSpool.isError && <ErrorMessage message={deleteSpool.error.message} />}
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleteSpool.isPending}>
              {deleteSpool.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </Modal>
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

        <div className={styles.identityCard}>
          {editing ? (
            <input
              aria-label="Brand"
              className={styles.editInput}
              value={draft?.brand ?? ''}
              onChange={(event) => updateDraft('brand', event.target.value)}
            />
          ) : (
            <div className={styles.brandLabel}>{spool.brand}</div>
          )}
          {editing ? (
            <input
              aria-label="Spool name"
              className={`${styles.editInput} ${styles.editTitleInput}`}
              value={draft?.materialName ?? ''}
              onChange={(event) => updateDraft('materialName', event.target.value)}
            />
          ) : (
            <h1 className={styles.title}>{spool.materialName}</h1>
          )}
          <div className={styles.badges}>
            {editing ? (
              <>
                <select
                  aria-label="Material type"
                  className={styles.editInput}
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
                </select>
                <select
                  aria-label="Finish"
                  className={styles.editInput}
                  value={draft?.tags[0]}
                  onChange={(event) =>
                    updateDraft('tags', [event.target.value as Spool['tags'][number]])
                  }
                >
                  {MATERIAL_TAGS.map((tag) => (
                    <option key={tag} value={tag}>
                      {formatTag(tag)}
                    </option>
                  ))}
                </select>
                <div className={styles.editColorGroup}>
                  <input
                    type="color"
                    aria-label="Color"
                    className={styles.editColorSwatch}
                    value={draft?.colorHex ?? '#888888'}
                    onChange={(event) => updateDraft('colorHex', event.target.value)}
                  />
                  <input
                    type="text"
                    aria-label="Color hex code"
                    className={styles.editColorHexInput}
                    value={draft?.colorHex ?? ''}
                    onChange={(event) => updateDraft('colorHex', event.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <span className={styles.badge}>{spool.materialType}</span>
                {finish && <span className={styles.badge}>{finish.toUpperCase()}</span>}
              </>
            )}
          </div>

          <div className={styles.miniStats}>
            <div className={styles.miniStat}>
              <div className={styles.miniStatLabel}>NET WEIGHT</div>
              <div className={styles.miniStatValue}>
                {formatWeight(spool.netWeightG, preferences.weightUnit)}
              </div>
            </div>
            <div className={styles.miniStat}>
              <div className={styles.miniStatLabel}>REMAINING</div>
              <div className={styles.miniStatValue}>
                {formatWeight(view.remainingWeightG, preferences.weightUnit)}
              </div>
            </div>
            <div className={styles.miniStat}>
              <div className={styles.miniStatLabel}>DIAMETER</div>
              <div className={styles.miniStatValue}>{view.filamentDiameterMm} mm</div>
            </div>
            {view.minNozzleTempC && (
              <div className={styles.miniStat}>
                <div className={styles.miniStatLabel}>PRINT TEMP</div>
                <div className={styles.miniStatValue}>
                  {formatTemperature(view.minNozzleTempC, preferences.temperatureUnit)}
                </div>
              </div>
            )}
          </div>

          {editing && (
            <div className={styles.remainingEditSection}>
              <div className={styles.remainingEditLabel}>Remaining weight</div>
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
        </div>
      </div>

      {spool.tag && (
        <div className={styles.tagBand}>
          <div className={styles.tagHeader}>
            <div className={styles.tagIcon} aria-hidden="true">
              <svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth={2}
                strokeLinecap="round"
              >
                <path d="M5 8a10 10 0 0 1 0 8" />
                <path d="M9 5a15 15 0 0 1 0 14" />
                <path d="M13 3a20 20 0 0 1 0 18" />
                <circle cx={19} cy={12} r={1.4} fill="var(--color-brand)" stroke="none" />
              </svg>
            </div>
            <div>
              <div className={styles.tagTitleRow}>
                <span className={styles.tagTitle}>NFC tag</span>
                <span className={styles.healthBadge} data-healthy={spool.tag.healthy}>
                  <span className={styles.healthDot} />
                  {spool.tag.healthy ? 'Healthy' : 'Needs attention'}
                </span>
              </div>
              <div className={styles.tagStandard}>{spool.tag.standard}</div>
            </div>
          </div>
          <div className={styles.tagStats}>
            <div>
              <div className={styles.tagStatLabel}>TAG UID</div>
              <div className={styles.tagStatValue}>{spool.tag.uid}</div>
            </div>
            <div>
              <div className={styles.tagStatLabel}>LAST SCANNED</div>
              <div className={styles.tagStatValue}>
                {formatRelativeTime(spool.tag.lastScannedAt)}
              </div>
            </div>
            <div>
              <div className={styles.tagStatLabel}>LAST WRITTEN</div>
              <div className={styles.tagStatValue}>
                {formatRelativeTime(spool.tag.lastWrittenAt)}
              </div>
            </div>
            {spool.tag.memoryUsedBytes !== undefined && spool.tag.memoryTotalBytes && (
              <div>
                <div className={styles.tagStatLabel}>MEMORY USED</div>
                <div className={styles.tagStatValue}>
                  {spool.tag.memoryUsedBytes} / {spool.tag.memoryTotalBytes} bytes
                </div>
                <div className={styles.memoryTrack}>
                  <div
                    className={styles.memoryFill}
                    style={{
                      width: `${(spool.tag.memoryUsedBytes / spool.tag.memoryTotalBytes) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.detailGrid}>
        <DetailCard
          title="PRINT SETTINGS"
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
          title="PHYSICAL"
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
            title="DRYING"
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
            title="COST & VALUE"
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
          title="IDENTITY & TAG"
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
          title="STORAGE & ASSIGNMENT"
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
                <select
                  aria-label="Status"
                  className={styles.editInput}
                  value={draft?.status}
                  onChange={(event) => updateDraft('status', event.target.value as Spool['status'])}
                >
                  {SPOOL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              ) : (
                formatStatus(view.status)
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
