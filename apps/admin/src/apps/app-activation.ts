import { useCallback, useSyncExternalStore } from 'react';

// Stub activation state. Apps have no backend yet, so which apps are active is
// kept in localStorage and shared through a tiny external store so every
// consumer (Apps pages, the nav, the editor's card config) sees one value.
const STORAGE_KEY = 'ghost-admin:apps:activated';

const listeners = new Set<() => void>();
let snapshot: readonly string[] | undefined;

function readStorage(): readonly string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeStorage(ids: readonly string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage can be unavailable (private mode, quota); in-memory state still works.
  }
}

function getSnapshot(): readonly string[] {
  snapshot ??= readStorage();
  return snapshot;
}

function setSnapshot(ids: readonly string[]) {
  snapshot = ids;
  writeStorage(ids);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isAppActivated(appId: string): boolean {
  return getSnapshot().includes(appId);
}

export function activateApp(appId: string) {
  if (!isAppActivated(appId)) {
    setSnapshot([...getSnapshot(), appId]);
  }
}

export function deactivateApp(appId: string) {
  if (isAppActivated(appId)) {
    setSnapshot(getSnapshot().filter((id) => id !== appId));
  }
}

/** Test-only: forget in-memory and stored activation state. */
export function resetAppActivation() {
  snapshot = undefined;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

export function useIsAppActivated(appId: string): boolean {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return ids.includes(appId);
}

export function useAppActivation(appId: string) {
  const isActivated = useIsAppActivated(appId);
  const activate = useCallback(() => activateApp(appId), [appId]);
  const deactivate = useCallback(() => deactivateApp(appId), [appId]);
  return { isActivated, activate, deactivate };
}
