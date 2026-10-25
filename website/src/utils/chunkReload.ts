/**
 * A lazily loaded page's JS chunk failed to download -- after a deploy
 * replaced it (a stale tab or cached index.html), on a flaky network, or when
 * Vite's dev server re-optimizes dependencies mid-session. A fresh page load
 * fixes all of these, so the app reloads once instead of showing an error.
 */
const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i, // Chromium
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
  /Unable to preload CSS/i, // Vite's CSS preload helper
];

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

const RELOAD_KEY = 'filacrypt:chunk-reload-at';
/** A second failure this soon after reloading means reloading won't help. */
const RELOAD_COOLDOWN_MS = 10_000;

interface ReloadDeps {
  reload: () => void;
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  now: number;
}

function defaultDeps(): ReloadDeps {
  let storage: ReloadDeps['storage'] = null;
  try {
    storage = window.sessionStorage;
  } catch {
    // Storage blocked (privacy mode): fall back to never auto-reloading.
  }
  return { reload: () => window.location.reload(), storage, now: Date.now() };
}

/**
 * Reloads the page unless it already did so moments ago (which would loop).
 * Returns whether it reloaded.
 */
export function reloadOnceForChunkError(deps: ReloadDeps = defaultDeps()): boolean {
  const { reload, storage, now } = deps;
  if (!storage) return false;
  const last = Number(storage.getItem(RELOAD_KEY) ?? 0);
  if (now - last < RELOAD_COOLDOWN_MS) return false;
  storage.setItem(RELOAD_KEY, String(now));
  reload();
  return true;
}
