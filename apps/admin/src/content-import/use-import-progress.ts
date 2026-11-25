import { useSyncExternalStore } from 'react';
import { importProgressStore } from './progress-store';

export function useImportProgress() {
  const { imports, track, dismiss } = useSyncExternalStore(
    importProgressStore.subscribe,
    importProgressStore.getSnapshot,
  );
  return { imports, track, dismiss };
}
