import { useEffect } from 'react';

let activeGuards = 0;

/** Whether a mounted unsaved-changes guard may currently block a navigation. */
export function hasActiveUnsavedChangesGuard(): boolean {
  return activeGuards > 0;
}

export function useTrackActiveUnsavedChangesGuard(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return;
    }
    activeGuards += 1;
    return () => {
      activeGuards -= 1;
    };
  }, [active]);
}
