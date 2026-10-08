import { preloadEditor } from './editor/api';
import { useFlagGatedRouteOwner } from './use-flag-gated-route-owner';
import { useIdlePreload } from './shared/use-idle-preload';

/** Fetches the React editor once a signed-in shell is idle, so opening a post doesn't wait on it. */
export function usePreloadEditor(signedIn: boolean): void {
  const shouldPreload = useFlagGatedRouteOwner('editorReact') === 'react' && signedIn;

  useIdlePreload(preloadEditor, shouldPreload);
}
