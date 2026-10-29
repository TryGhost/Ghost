import { useEffect } from 'react';

const IDLE_FALLBACK_MS = 2000;

/** Runs `preload` once the browser is idle while `enabled`, so a later screen's code is ready. */
export function useIdlePreload(preload: () => void, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    // Safari has no requestIdleCallback.
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(() => preload());
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(preload, IDLE_FALLBACK_MS);
    return () => clearTimeout(handle);
  }, [enabled, preload]);
}
