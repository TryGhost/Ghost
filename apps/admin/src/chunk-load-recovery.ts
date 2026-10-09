import { reloadAdmin } from '@/auth/api';

// Chromium, Firefox, Safari and Vite's stylesheet preload, in turn
const CHUNK_LOAD_ERROR =
  /^(Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS)/;

const RELOADED_AT_KEY = 'ghost-admin-chunk-load-reload';
const RELOAD_INTERVAL_MS = 60 * 1000;

/** Whether `error` is a lazily loaded file of the admin's own code failing to load. */
export function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_LOAD_ERROR.test(error.message);
}

/**
 * Reloads the admin at the route after its code failed to load: a browser never
 * fetches a failed module again until the page reloads. Reloads at most once a
 * minute and never offline, so a failure that persists is left on screen.
 */
export function reloadAfterChunkLoadError(
  error: unknown,
  { pathname, search }: { pathname: string; search: string },
): boolean {
  if (!isChunkLoadError(error) || !navigator.onLine) {
    return false;
  }
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOADED_AT_KEY)) < RELOAD_INTERVAL_MS) {
      return false;
    }
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
  } catch {
    return false;
  }
  // After the error's commit, so an unmounted editor has dropped its unload prompt
  setTimeout(() => reloadAdmin(`${pathname}${search}`));
  return true;
}
