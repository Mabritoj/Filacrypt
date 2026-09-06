import { vi } from 'vitest';

/**
 * Test double for Web NFC's NDEFReader.
 *
 * jsdom has no NDEFReader at all, which is useful in itself: the absent case
 * is the default and exercises the app's silent fallback to manual entry.
 * Install this when you want to drive the NFC path instead.
 */
export class FakeNDEFReader {
  static instances: FakeNDEFReader[] = [];
  static scanImpl: (options?: { signal?: AbortSignal }) => Promise<void> = () => Promise.resolve();

  onreading: ((event: unknown) => void) | null = null;
  onreadingerror: ((event: unknown) => void) | null = null;
  signal?: AbortSignal;

  constructor() {
    FakeNDEFReader.instances.push(this);
  }

  scan(options?: { signal?: AbortSignal }): Promise<void> {
    this.signal = options?.signal;
    return FakeNDEFReader.scanImpl(options);
  }

  /** The most recently constructed reader -- i.e. the currently armed one. */
  static get last(): FakeNDEFReader {
    const reader = FakeNDEFReader.instances.at(-1);
    if (!reader) throw new Error('no FakeNDEFReader was constructed');
    return reader;
  }

  static reset() {
    FakeNDEFReader.instances = [];
    FakeNDEFReader.scanImpl = () => Promise.resolve();
  }
}

/** Installs the fake as `window.NDEFReader`. Pair with `vi.unstubAllGlobals()`. */
export function installFakeNdefReader() {
  FakeNDEFReader.reset();
  vi.stubGlobal('NDEFReader', FakeNDEFReader);
}

export function makeMimeRecord(mediaType: string, bytes: Uint8Array) {
  return {
    recordType: 'mime',
    mediaType,
    data: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
  };
}
