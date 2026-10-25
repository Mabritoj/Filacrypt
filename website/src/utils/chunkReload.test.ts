import { describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, reloadOnceForChunkError } from './chunkReload';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/InventoryHome-abc.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/x.css',
  ])('recognizes "%s"', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('ignores ordinary errors', () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'id')"))).toBe(
      false,
    );
  });
});

describe('reloadOnceForChunkError', () => {
  it('reloads the first time', () => {
    const reload = vi.fn();
    expect(reloadOnceForChunkError({ reload, storage: memoryStorage(), now: 1_000_000 })).toBe(
      true,
    );
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload again within the cooldown, so it can never loop', () => {
    const reload = vi.fn();
    const storage = memoryStorage();
    reloadOnceForChunkError({ reload, storage, now: 1_000_000 });
    expect(reloadOnceForChunkError({ reload, storage, now: 1_005_000 })).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('reloads again once the cooldown has passed', () => {
    const reload = vi.fn();
    const storage = memoryStorage();
    reloadOnceForChunkError({ reload, storage, now: 1_000_000 });
    expect(reloadOnceForChunkError({ reload, storage, now: 1_020_000 })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('never reloads without storage to remember it by', () => {
    const reload = vi.fn();
    expect(reloadOnceForChunkError({ reload, storage: null, now: 1 })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
