import type { SaveEngineState } from '@/editor/engine/save-engine';
import type { PostType } from '@/editor/card-config';

interface GuardedLocation {
  pathname: string;
  state?: unknown;
}

/**
 * Whether leaving now could lose content: the post diverges from the server, or
 * the engine still owes it a write that has not been acknowledged.
 */
export function hasUnsavedWork(state: SaveEngineState, isDirty: boolean): boolean {
  if (isDirty) {
    return true;
  }
  return state.kind === 'saving' || state.kind === 'pending-coalesced';
}

/**
 * Whether a navigation is the session's own URL replace after a create rather
 * than a writer leaving: `/editor/post` to `/editor/post/:id`, carrying the
 * session key so the same session survives the swap.
 */
export function isCreatedIdUrlSwap(
  current: GuardedLocation,
  next: GuardedLocation,
  postType: PostType,
  sessionKey: string,
): boolean {
  const newPath = `/editor/${postType}`;
  if (current.pathname !== newPath || !next.pathname.startsWith(`${newPath}/`)) {
    return false;
  }
  const id = next.pathname.slice(newPath.length + 1);
  if (!id || id.includes('/')) {
    return false;
  }
  const state = next.state as { editorSession?: string } | null | undefined;
  return state?.editorSession === sessionKey;
}
