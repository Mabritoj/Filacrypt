import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { REAL_PRUSAMENT_PC_CF_PAYLOAD_HEX, hexToBytes } from '../utils/openPrintTag/fixtures';
import {
  FakeNDEFReader,
  installFakeNdefReader,
  makeMimeRecord as makeRecord,
} from '../test/fakeNdefReader';
import { useNfcScan, type NfcScanError, type NfcScanResult } from './useNfcScan';

function realTagRecord() {
  return makeRecord('application/vnd.openprinttag', hexToBytes(REAL_PRUSAMENT_PC_CF_PAYLOAD_HEX));
}

function setup() {
  const onResult = vi.fn<(result: NfcScanResult) => void>();
  const onError = vi.fn<(error: NfcScanError) => void>();
  const view = renderHook(() => useNfcScan({ onResult, onError }));
  return { onResult, onError, ...view };
}

describe('useNfcScan', () => {
  describe('when Web NFC is unavailable (iOS, desktop)', () => {
    it('reports unsupported and does nothing on start', () => {
      const { result, onError } = setup();
      expect(result.current.isSupported).toBe(false);

      act(() => result.current.start());

      expect(result.current.isScanning).toBe(false);
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('when Web NFC is available', () => {
    beforeEach(() => {
      installFakeNdefReader();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('reports supported', () => {
      const { result } = setup();
      expect(result.current.isSupported).toBe(true);
    });

    it('starts scanning on start()', () => {
      const { result } = setup();
      act(() => result.current.start());

      expect(FakeNDEFReader.instances).toHaveLength(1);
      expect(result.current.isScanning).toBe(true);
    });

    it('decodes a real OpenPrintTag record into a result', () => {
      const { result, onResult } = setup();
      act(() => result.current.start());

      act(() => {
        FakeNDEFReader.last.onreading?.({
          serialNumber: '3c:d9:2f:66:08:01:04:e0',
          message: { records: [realTagRecord()] },
        });
      });

      expect(onResult).toHaveBeenCalledTimes(1);
      const scan = onResult.mock.calls[0][0];
      expect(scan.payload.materialName).toBe('PC Blend Carbon Fiber Black');
      expect(scan.payload.materialType).toBe('PC');
      expect(scan.serialNumber).toBe('3c:d9:2f:66:08:01:04:e0');
      expect(scan.payloadByteLength).toBe(245);
    });

    it('finds the OpenPrintTag record even when other records come first', () => {
      // Real tags carry a product URL record before the filament data, so
      // taking records[0] would find no filament data at all.
      const { result, onResult } = setup();
      act(() => result.current.start());

      act(() => {
        FakeNDEFReader.last.onreading?.({
          serialNumber: '3c:d9:2f:66:08:01:04:e0',
          message: {
            records: [
              { recordType: 'url', data: new DataView(new ArrayBuffer(4)) },
              realTagRecord(),
            ],
          },
        });
      });

      expect(onResult).toHaveBeenCalledTimes(1);
      expect(onResult.mock.calls[0][0].payload.brandName).toBe('Prusament');
    });

    it('reports an empty tag rather than failing', () => {
      const { result, onError } = setup();
      act(() => result.current.start());

      act(() => {
        FakeNDEFReader.last.onreading?.({ serialNumber: 'x', message: { records: [] } });
      });

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'no-records' }));
    });

    it('reports a non-OpenPrintTag tag and names what it saw', () => {
      const { result, onError } = setup();
      act(() => result.current.start());

      act(() => {
        FakeNDEFReader.last.onreading?.({
          serialNumber: 'x',
          message: { records: [makeRecord('text/plain', new Uint8Array([1, 2]))] },
        });
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'not-openprinttag',
          message: expect.stringContaining('text/plain'),
        }),
      );
    });

    it('reports a decode failure for a corrupt payload', () => {
      const { result, onError } = setup();
      act(() => result.current.start());

      act(() => {
        FakeNDEFReader.last.onreading?.({
          serialNumber: 'x',
          message: {
            records: [makeRecord('application/vnd.openprinttag', Uint8Array.from([0x01, 0x02]))],
          },
        });
      });

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'decode-failed' }));
    });

    it('reports a read error when the tag moves away mid-read', () => {
      const { result, onError } = setup();
      act(() => result.current.start());

      act(() => FakeNDEFReader.last.onreadingerror?.({}));

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'read-error' }));
    });

    it('surfaces a denied permission distinctly', async () => {
      FakeNDEFReader.scanImpl = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
      const { result, onError } = setup();

      await act(async () => {
        result.current.start();
        await Promise.resolve();
      });

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'permission-denied' }));
      expect(result.current.isScanning).toBe(false);
    });

    it('stays silent when the scan is aborted by us', async () => {
      FakeNDEFReader.scanImpl = () => Promise.reject(new DOMException('aborted', 'AbortError'));
      const { result, onError } = setup();

      await act(async () => {
        result.current.start();
        await Promise.resolve();
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('aborts the reader on stop()', () => {
      const { result } = setup();
      act(() => result.current.start());
      const { signal } = FakeNDEFReader.last;
      expect(signal?.aborted).toBe(false);

      act(() => result.current.stop());

      expect(signal?.aborted).toBe(true);
      expect(result.current.isScanning).toBe(false);
    });

    it('aborts the reader on unmount', () => {
      const { result, unmount } = setup();
      act(() => result.current.start());
      const { signal } = FakeNDEFReader.last;

      unmount();

      expect(signal?.aborted).toBe(true);
    });

    it('builds a fresh reader for each scan, since an aborted one never fires again', () => {
      const { result } = setup();
      act(() => result.current.start());
      const first = FakeNDEFReader.last;

      act(() => result.current.start());
      const second = FakeNDEFReader.last;

      expect(FakeNDEFReader.instances).toHaveLength(2);
      expect(second).not.toBe(first);
      expect(first.signal?.aborted).toBe(true);
      expect(second.signal?.aborted).toBe(false);
    });
  });
});
