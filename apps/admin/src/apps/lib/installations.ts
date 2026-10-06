import { useSyncExternalStore } from 'react';
import type { AppInstallation, AppManifest } from '@/apps/types';

/**
 * Prototype storage for installations, kept in the browser until the
 * installations table and Admin API exist (BER-3979). Installations are never
 * deleted: uninstalling marks them, so the history of every install is kept.
 */
const STORAGE_KEY = 'ghost-admin:apps:installations';

let cache: AppInstallation[] | null = null;
const listeners = new Set<() => void>();

function read(): AppInstallation[] {
  if (cache) {
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as AppInstallation[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: AppInstallation[]) {
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
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

export function getInstallation(id: string): AppInstallation | undefined {
  return read().find((installation) => installation.id === id);
}

export function isInstallationActive(id: string): boolean {
  return getInstallation(id)?.status === 'active';
}

export function findActiveInstallation(manifestUrl: string): AppInstallation | undefined {
  return read().find(
    (installation) => installation.status === 'active' && installation.manifestUrl === manifestUrl,
  );
}

export function installApp(
  manifestUrl: string,
  manifest: AppManifest,
  installedBy?: { id: string; name: string },
): AppInstallation {
  const installation: AppInstallation = {
    id: createId(),
    manifestUrl,
    manifest,
    source: 'link',
    status: 'active',
    installedAt: new Date().toISOString(),
    installedBy,
  };
  write([...read(), installation]);
  return installation;
}

/**
 * Applies a refreshed manifest (BER-3990: valid updates apply without
 * re-approval). Only an active installation changes, so a refresh that
 * finishes after an uninstall can't revive it or touch a later reinstall.
 */
export function updateInstallationManifest(id: string, manifest: AppManifest) {
  if (!isInstallationActive(id)) {
    return;
  }
  write(
    read().map((installation) =>
      installation.id === id ? { ...installation, manifest } : installation,
    ),
  );
}

export function uninstallApp(id: string) {
  write(
    read().map((installation) =>
      installation.id === id && installation.status === 'active'
        ? { ...installation, status: 'uninstalled', uninstalledAt: new Date().toISOString() }
        : installation,
    ),
  );
}

export function useInstallations(): AppInstallation[] {
  return useSyncExternalStore(subscribe, read, read);
}

let activeCache: { source: AppInstallation[]; active: AppInstallation[] } | null = null;

// The same array until the installations change, so callers can memoise on it.
function readActive(): AppInstallation[] {
  const all = read();
  if (activeCache?.source !== all) {
    activeCache = {
      source: all,
      active: all.filter((installation) => installation.status === 'active'),
    };
  }
  return activeCache.active;
}

export function useActiveInstallations(): AppInstallation[] {
  return useSyncExternalStore(subscribe, readActive, readActive);
}

/** Test helper: forget the cached copy so the next read comes from storage. */
export function resetInstallationsCache() {
  cache = null;
}
