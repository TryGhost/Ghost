import { useEffect } from 'react';
import { preloadEditor } from './editor/api';
import { useFlagGatedRouteOwner } from './use-flag-gated-route-owner';

const IDLE_FALLBACK_MS = 2000;

/** Fetches the React editor once a signed-in shell is idle, so opening a post doesn't wait on it. */
export function usePreloadEditor(signedIn: boolean): void {
  const shouldPreload = useFlagGatedRouteOwner('editorReact') === 'react' && signedIn;

  useEffect(() => {
    if (!shouldPreload) {
      return;
    }
    // Safari has no requestIdleCallback.
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(preloadEditor);
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(preloadEditor, IDLE_FALLBACK_MS);
    return () => clearTimeout(handle);
  }, [shouldPreload]);
}
