import { preloadEditor } from './editor/api';
import { useIdlePreload } from './shared/use-idle-preload';

/** Fetches the editor once a signed-in shell is idle, so opening a post doesn't wait on it. */
export function usePreloadEditor(signedIn: boolean): void {
  useIdlePreload(preloadEditor, signedIn);
}
