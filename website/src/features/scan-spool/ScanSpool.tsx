import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAddSpool } from '../../api/spools';
import { useUser } from '../../api/user';
import { useWorkspace } from '../../api/workspace';
import type { Spool, SpoolNfcTagStatus, Workspace } from '../../api/types';
import { Alert } from '../../components/Alert';
import { AppHeader } from '../../components/AppHeader';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorMessage } from '../../components/ErrorMessage';
import { NfcIcon } from '../../components/icons';
import { PageShell } from '../../components/PageShell';
import { Text } from '../../components/Text';
import { LoadingSpool } from '../../components/LoadingSpool';
import { useWorkspaceId } from '../../hooks/useWorkspaceId';
import { useNfcScan, type NfcScanError, type NfcScanResult } from '../../hooks/useNfcScan';
import type { OpenPrintTagPayload } from '../../utils/openPrintTag/types';
import { ReviewForm, type ReviewFormValues } from './ReviewForm';
import { payloadToReviewValues, payloadToSpoolExtras, payloadToTagStatus } from './tagToSpool';
import styles from './ScanSpool.module.css';
import { humanizeEnum } from '../../utils/format';

/**
 * There is deliberately no separate "scanning" step: the reader card arms
 * itself and reports its own state, so entering NFC mode is one screen rather
 * than a tap-through wizard.
 */
type Step = 'ready' | 'detected' | 'added';

interface ScannedTag {
  payload: OpenPrintTagPayload;
  values: ReviewFormValues;
  status: SpoolNfcTagStatus;
}

function manualEntryDefaults(workspace: Workspace | undefined): ReviewFormValues {
  return {
    brand: '',
    materialName: '',
    materialType: 'PLA',
    finish: 'matte',
    colorHex: '#9a9a9a',
    netWeightG: 1000,
    filamentDiameterMm: workspace?.defaultDiameterMm ?? 1.75,
    emptyContainerWeightG: workspace?.defaultEmptySpoolWeightG ?? 215,
    minNozzleTempC: 200,
    maxNozzleTempC: 220,
    bedTempC: 60,
    markFull: true,
  };
}

/** Errors that mean this tag won't get better -- go back and let them retry. */
const TERMINAL_SCAN_ERRORS = new Set<NfcScanError['kind']>(['permission-denied', 'decode-failed']);

export function ScanSpool() {
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();
  const workspaceQuery = useWorkspace(workspaceId ?? '');
  const addSpool = useAddSpool(workspaceId ?? '');
  const userQuery = useUser();

  const [stepOverride, setStepOverride] = useState<Step | null>(null);
  const [sourceOverride, setSourceOverride] = useState<'tag' | 'manual' | null>(null);
  const [addedSpool, setAddedSpool] = useState<Spool | null>(null);
  const [scannedTag, setScannedTag] = useState<ScannedTag | null>(null);
  const [scanError, setScanError] = useState<NfcScanError | null>(null);
  /** Distinguishes a tap-triggered scan from an automatic one, for messaging. */
  const userInitiatedRef = useRef(false);
  /** Guards the auto-start so a refused scan doesn't retry on every render. */
  const autoStartedRef = useRef(false);

  // Safe to re-create on workspace changes: useNfcScan holds its callbacks in
  // refs, so a new identity doesn't re-subscribe or restart the reader.
  const handleScanResult = useCallback(
    (result: NfcScanResult) => {
      setScannedTag({
        payload: result.payload,
        values: payloadToReviewValues(result.payload, workspaceQuery.data),
        status: payloadToTagStatus(
          result.payload,
          result.serialNumber,
          result.payloadByteLength,
          new Date().toISOString(),
        ),
      });
      setScanError(null);
      setStepOverride('detected');
    },
    [workspaceQuery.data],
  );

  const handleScanError = useCallback((error: NfcScanError) => {
    // A rejected auto-start usually just means the browser wanted a gesture we
    // didn't have, which is expected -- the card falls back to a tap prompt
    // rather than accusing the user of denying permission.
    if (error.kind === 'permission-denied' && !userInitiatedRef.current) {
      setStepOverride('ready');
      return;
    }
    setScanError(error);
    if (TERMINAL_SCAN_ERRORS.has(error.kind)) {
      setStepOverride('ready');
    }
  }, []);

  const nfc = useNfcScan({ onResult: handleScanResult, onError: handleScanError });

  // Without Web NFC there is no reader to fall back to, so the whole NFC path
  // is hidden and manual entry becomes the only mode -- silently, per design.
  const preferredEntryMode = userQuery.data?.preferences.defaultEntryMode ?? 'nfc';
  const effectiveEntryMode: 'nfc' | 'manual' = nfc.isSupported ? preferredEntryMode : 'manual';

  // Derived rather than seeded: userQuery is usually still pending on first
  // render, so a useState initialiser would latch 'nfc' and never correct once
  // the preference (or NFC support) resolved.
  const step: Step = stepOverride ?? (effectiveEntryMode === 'manual' ? 'detected' : 'ready');
  const source: 'tag' | 'manual' =
    sourceOverride ?? (effectiveEntryMode === 'manual' ? 'manual' : 'tag');

  const manualDefaults = useMemo(
    () => manualEntryDefaults(workspaceQuery.data),
    [workspaceQuery.data],
  );

  // Arm the reader as soon as the card is shown, so adding a spool is "open
  // the page, hold the spool" rather than an extra tap nobody expects. The
  // gesture from tapping "Add Spool" usually still counts, since this is a
  // client-side route change rather than a fresh document.
  const { isSupported: nfcSupported, start: startNfc } = nfc;
  useEffect(() => {
    if (step !== 'ready' || source !== 'tag' || !nfcSupported) {
      autoStartedRef.current = false;
      return;
    }
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    userInitiatedRef.current = false;
    startNfc();
  }, [step, source, nfcSupported, startNfc]);

  /**
   * Enters the NFC flow at its start -- the reader card -- rather than jumping
   * into a waiting state. Everything that puts the user into NFC mode routes
   * through here, so the experience is identical whether they arrived from the
   * NFC preference, from "Switch to NFC", or from "Rescan".
   */
  function switchToNfc() {
    nfc.stop();
    setScanError(null);
    setScannedTag(null);
    setSourceOverride('tag');
    setStepOverride('ready');
  }

  /** Re-arms the reader from an explicit tap, so failures are worth surfacing. */
  function startScan() {
    userInitiatedRef.current = true;
    setScanError(null);
    setScannedTag(null);
    setSourceOverride('tag');
    nfc.start();
  }

  function enterManually() {
    nfc.stop();
    setSourceOverride('manual');
    setStepOverride('detected');
  }

  function reset() {
    nfc.stop();
    setStepOverride(null);
    setSourceOverride(null);
    setAddedSpool(null);
    setScannedTag(null);
    setScanError(null);
  }

  function handleCancel() {
    // Abandoning a scanned tag returns to the reader regardless of preference,
    // so backing out of the NFC flow always lands in the same place.
    if (source === 'tag') {
      switchToNfc();
      return;
    }
    if (effectiveEntryMode === 'manual') {
      navigate('/inventory');
      return;
    }
    reset();
  }

  function handleSubmit(values: ReviewFormValues) {
    if (!workspaceQuery.data) return;

    const extras = scannedTag ? payloadToSpoolExtras(scannedTag.payload) : {};
    const decodedTags = scannedTag?.payload.tags ?? [];
    const consumedWeightG = scannedTag?.payload.aux.consumedWeightG ?? 0;

    addSpool.mutate(
      {
        // Decoded-only fields first, so anything the user edited below wins.
        ...extras,
        workspaceId: workspaceQuery.data.id,
        brand: values.brand,
        materialType: values.materialType,
        materialName: values.materialName,
        // Keep every property the tag declared, with the chosen finish first.
        tags: [values.finish, ...decodedTags.filter((tag) => tag !== values.finish)],
        colorHex: values.colorHex,
        netWeightG: values.netWeightG,
        remainingWeightG: values.markFull
          ? values.netWeightG
          : Math.max(0, values.netWeightG - consumedWeightG),
        emptyContainerWeightG: values.emptyContainerWeightG,
        filamentDiameterMm: values.filamentDiameterMm,
        minNozzleTempC: values.minNozzleTempC,
        maxNozzleTempC: values.maxNozzleTempC,
        minBedTempC: values.bedTempC,
        maxBedTempC: values.bedTempC,
        status: 'in_use',
        addedBy: userQuery.data?.id ?? '',
        tag: scannedTag?.status,
      },
      {
        onSuccess: (spool) => {
          setAddedSpool(spool);
          setStepOverride('added');
        },
      },
    );
  }

  if (workspaceQuery.isPending) {
    return (
      <PageShell
        centered
        header={
          <AppHeader
            breadcrumb={
              <Breadcrumb
                items={[{ label: 'Inventory', to: '/inventory' }, { label: 'Add Spool' }]}
              />
            }
          />
        }
      >
        <LoadingSpool message="Loading…" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AppHeader
        breadcrumb={
          <Breadcrumb items={[{ label: 'Inventory', to: '/inventory' }, { label: 'Add Spool' }]} />
        }
      />

      <div className={styles.content}>
        {step === 'ready' && (
          <Card padding="none" className={styles.card}>
            <div className={styles.reader}>
              <span className={styles.pulse} />
              <span className={`${styles.pulse} ${styles.pulseDelayed}`} />
              <button
                type="button"
                className={styles.readerButton}
                onClick={startScan}
                title="Tap, then hold the spool to your phone"
                aria-label="Scan a spool"
              >
                <NfcIcon size={52} />
              </button>
            </div>
            <Text variant="h1">Scan a spool</Text>
            <Text tone="muted" className={styles.subtitle}>
              {nfc.isScanning
                ? 'Hold your tagged spool against the back of your phone — the OpenPrintTag is read and every field fills in automatically.'
                : 'Tap the reader above to start scanning, then hold your tagged spool against the back of your phone.'}
            </Text>
            <div className={styles.readerStatus} data-armed={nfc.isScanning}>
              <span className={styles.readerStatusDot} />
              {nfc.isScanning ? 'Listening for a tag' : 'Tap the reader to start'}
            </div>
            {scanError && (
              <Alert tone="error" className={styles.scanError}>
                {scanError.message}
              </Alert>
            )}
            <Button variant="ghost" className={styles.manualLink} onClick={enterManually}>
              Enter manually instead
            </Button>
          </Card>
        )}

        {step === 'detected' && (
          <Card padding="none" className={styles.detectedCard}>
            {source === 'tag' && scannedTag ? (
              <div className={styles.detectedBanner}>
                <span className={styles.detectedDot} />
                <div className={styles.detectedText}>
                  <div className={styles.detectedTitle}>Tag detected — new spool</div>
                  <div className={styles.detectedMeta}>
                    OpenPrintTag · {scannedTag.status.standard} · UID {scannedTag.status.uid}
                  </div>
                </div>
                <Button variant="secondary" onClick={switchToNfc}>
                  Rescan
                </Button>
              </div>
            ) : (
              <div className={styles.manualBanner}>
                <span className={styles.detectedTitle}>Manual entry</span>
                {nfc.isSupported && (
                  <Button variant="secondary" onClick={switchToNfc} icon={<NfcIcon size={14} />}>
                    Switch to NFC
                  </Button>
                )}
              </div>
            )}

            <div className={styles.formWrap}>
              {source === 'tag' && scannedTag && (
                <div className={styles.preview}>
                  <div
                    className={styles.previewSwatch}
                    // The filament color is data, so it reaches CSS as a custom property.
                    style={{ '--swatch': scannedTag.values.colorHex } as CSSProperties}
                  />
                  <div>
                    <div className={styles.previewName}>{scannedTag.values.materialName}</div>
                    <div className={styles.previewBrand}>
                      {scannedTag.values.brand} · {scannedTag.values.materialType}{' '}
                      {humanizeEnum(scannedTag.values.finish)}
                    </div>
                  </div>
                  <div className={styles.previewWeight}>
                    <Text variant="label" as="div">
                      On tag
                    </Text>
                    <div className={styles.previewWeightValue}>
                      {scannedTag.values.netWeightG} g
                    </div>
                  </div>
                </div>
              )}

              <Text variant="label" as="div" className={styles.reviewLabel}>
                {source === 'tag' ? 'Review & confirm — pre-filled from tag' : 'Spool details'}
              </Text>

              {addSpool.isError && <ErrorMessage message={addSpool.error.message} />}

              <ReviewForm
                initialValues={source === 'tag' && scannedTag ? scannedTag.values : manualDefaults}
                isSubmitting={addSpool.isPending}
                onCancel={handleCancel}
                onSubmit={handleSubmit}
              />
            </div>
          </Card>
        )}

        {step === 'added' && addedSpool && (
          <Card padding="none" className={styles.card}>
            <div className={styles.successIcon} aria-hidden="true">
              ✓
            </div>
            <Text variant="h1">Added to inventory</Text>
            <Text tone="muted" className={styles.subtitle}>
              {addedSpool.materialName} · {addedSpool.brand} {addedSpool.materialType} is now
              tracked.
            </Text>
            <div className={styles.finalActions}>
              <Button to="/inventory" variant="secondary">
                View inventory
              </Button>
              <Button onClick={reset}>Scan another</Button>
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
