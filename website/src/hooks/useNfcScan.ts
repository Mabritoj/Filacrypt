import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OPENPRINTTAG_MIME_TYPE, decodeOpenPrintTag } from '../utils/openPrintTag/decode';
import type { OpenPrintTagPayload } from '../utils/openPrintTag/types';

export type NfcScanErrorKind =
  'permission-denied' | 'no-records' | 'not-openprinttag' | 'decode-failed' | 'read-error';

export interface NfcScanError {
  kind: NfcScanErrorKind;
  message: string;
}

export interface NfcScanResult {
  payload: OpenPrintTagPayload;
  serialNumber: string;
  payloadByteLength: number;
  warnings: string[];
}

export interface UseNfcScanOptions {
  onResult: (result: NfcScanResult) => void;
  onError: (error: NfcScanError) => void;
}

export interface NfcScanController {
  /** False on iOS, desktop, and any non-Chromium Android browser. */
  isSupported: boolean;
  isScanning: boolean;
  /**
   * Must be called directly from a user gesture -- Web NFC requires transient
   * activation, and awaiting anything beforehand consumes it.
   */
  start: () => void;
  stop: () => void;
}

function toUint8Array(data: DataView): Uint8Array {
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

/**
 * Wraps Web NFC's NDEFReader for reading OpenPrintTag filament tags.
 *
 * Deliberately thin: everything parsing-related lives in utils/openPrintTag so
 * it can be tested without a DOM. This hook only owns the reader lifecycle,
 * permissions, and record selection.
 */
export function useNfcScan({ onResult, onError }: UseNfcScanOptions): NfcScanController {
  const [isScanning, setIsScanning] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  /**
   * The reader has to be held somewhere that outlives start(). As a local it
   * becomes unreachable the moment start() returns, and once it is collected
   * its onreading handler stops firing -- an armed-looking scan that silently
   * never reads a tag. The longer the gap between scan() and presenting the
   * spool, the more reliably it breaks.
   */
  const readerRef = useRef<NDEFReader | null>(null);

  // Held in refs so callers can pass inline callbacks without the reader
  // re-subscribing on every render.
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onErrorRef.current = onError;

  const isSupported = useMemo(() => typeof window !== 'undefined' && 'NDEFReader' in window, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    readerRef.current = null;
    setIsScanning(false);
  }, []);

  const start = useCallback(() => {
    if (!isSupported) return;

    // An aborted reader cannot be reused, so a rescan needs a fresh pair or it
    // silently never fires.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const reader = new NDEFReader();
    readerRef.current = reader;

    reader.onreading = (event: NDEFReadingEvent) => {
      const records = event.message.records;
      if (records.length === 0) {
        onErrorRef.current({
          kind: 'no-records',
          message: "This tag is empty — it hasn't been written with filament data yet.",
        });
        return;
      }

      const record = records.find(
        (candidate) =>
          candidate.recordType === 'mime' && candidate.mediaType === OPENPRINTTAG_MIME_TYPE,
      );

      if (!record?.data) {
        const seen = records
          .map((candidate) => candidate.mediaType ?? candidate.recordType)
          .join(', ');
        onErrorRef.current({
          kind: 'not-openprinttag',
          message: `That's an NFC tag, but not an OpenPrintTag (found: ${seen}).`,
        });
        return;
      }

      const bytes = toUint8Array(record.data);
      const decoded = decodeOpenPrintTag(bytes);

      if (!decoded.ok) {
        onErrorRef.current({
          kind: 'decode-failed',
          message: `Couldn't read this tag's data: ${decoded.message}`,
        });
        return;
      }

      onResultRef.current({
        payload: decoded.payload,
        serialNumber: event.serialNumber,
        payloadByteLength: bytes.byteLength,
        warnings: decoded.warnings,
      });
    };

    reader.onreadingerror = () => {
      // Typically the tag moved out of range mid-read. The reader stays armed,
      // so the natural recovery is simply holding the spool steadier.
      onErrorRef.current({
        kind: 'read-error',
        message: 'Lost the tag — hold it against the phone and try again.',
      });
    };

    setIsScanning(true);

    reader.scan({ signal: controller.signal }).catch((error: unknown) => {
      // Our own stop()/unmount aborts land here; they aren't failures.
      if (error instanceof DOMException && error.name === 'AbortError') return;

      controllerRef.current = null;
      setIsScanning(false);

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        onErrorRef.current({
          kind: 'permission-denied',
          message:
            'Filacrypt needs permission to use NFC. Check the padlock icon in the address bar.',
        });
        return;
      }

      onErrorRef.current({
        kind: 'read-error',
        message: error instanceof Error ? error.message : 'Could not start NFC scanning.',
      });
    });
  }, [isSupported]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
      readerRef.current = null;
    };
  }, []);

  return { isSupported, isScanning, start, stop };
}
