import type { TrackedImport } from './progress';
import { isImportId, readImportIds, writeImportIds } from './progress-storage';

interface ProgressSnapshot {
  key: string | null;
  ids: string[];
  imports: TrackedImport[];
  track: (id: string) => void;
  dismiss: (id: string) => void;
  update: (progress: TrackedImport) => void;
}

const ignore = () => {};
const EMPTY: ProgressSnapshot = {
  key: null,
  ids: [],
  imports: [],
  track: ignore,
  dismiss: ignore,
  update: ignore,
};

export function createImportProgressStore() {
  let snapshot = EMPTY;
  let active: object | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: ProgressSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    connect: (key: string) => {
      const session = {};
      active = session;
      let ids = readImportIds(key);
      const results = new Map<string, TrackedImport>();
      const refresh = () => {
        publish({ key, ids, imports: ids.flatMap((id) => results.get(id) ?? []), ...actions });
      };
      // Actions belong to this signed-in session. Late requests or callbacks
      // must not change another user's state, or resurrect a dismissed import.
      const actions = {
        track: (id: string) => {
          if (active !== session || !isImportId(id) || ids.includes(id)) {
            return;
          }
          ids = [...ids, id];
          writeImportIds(key, ids);
          refresh();
        },
        dismiss: (id: string) => {
          if (active !== session) {
            return;
          }
          ids = ids.filter((value) => value !== id);
          results.delete(id);
          writeImportIds(key, ids);
          refresh();
        },
        update: (progress: TrackedImport) => {
          if (active !== session || !ids.includes(progress.import_id)) {
            return;
          }
          results.set(progress.import_id, progress);
          refresh();
        },
      };
      const sync = (event: StorageEvent) => {
        if (active === session && (event.key === key || event.key === null)) {
          ids = readImportIds(key);
          for (const id of results.keys()) {
            if (!ids.includes(id)) {
              results.delete(id);
            }
          }
          refresh();
        }
      };
      window.addEventListener('storage', sync);
      refresh();
      return () => {
        window.removeEventListener('storage', sync);
        if (active === session) {
          active = null;
          publish(EMPTY);
        }
      };
    },
  };
}

export const importProgressStore = createImportProgressStore();
