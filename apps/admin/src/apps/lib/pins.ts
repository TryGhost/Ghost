import { useSyncExternalStore } from 'react';

/**
 * Which apps stay in the sidebar outside Apps. Kept in the browser for the
 * prototype; the real thing is a per-staff-user preference.
 */
const STORAGE_KEY = 'ghost-admin:apps:pinned';

let cache: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  if (cache) {
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: string[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); keep the in-memory copy.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setAppPinned(installationId: string, pinned: boolean) {
  const current = read().filter((id) => id !== installationId);
  write(pinned ? [...current, installationId] : current);
}

/** How many apps a fresh install pins on its own before the sidebar is full. */
export const MAX_AUTO_PINNED = 3;

/**
 * A new install pins itself while the sidebar has room, so the Apps group isn't
 * empty after installing. It's a one-time pin, not a default: once unpinned, an
 * app stays unpinned, and nothing else moves up to take its place.
 */
export function pinOnInstall(installationId: string) {
  if (read().length < MAX_AUTO_PINNED) {
    setAppPinned(installationId, true);
  }
}

/** Installation ids, in the order they were pinned. */
export function usePinnedApps(): string[] {
  return useSyncExternalStore(subscribe, read, read);
}

/** Test helper: forget the cached copy so the next read comes from storage. */
export function resetPinsCache() {
  cache = null;
}
