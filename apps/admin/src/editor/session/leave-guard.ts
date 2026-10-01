import { withoutTrailingSlash } from '@/hooks/use-history-pop-navigation-guard';
import type { LeaveDecision, SaveEngineState } from '@/editor/engine/save-engine';
import type { PostType } from '@/editor/card-config';

// Outlasts the transport's 15s of retries and its final attempt, so a landing save is not cut off.
export const LEAVE_DECISION_DEADLINE_MS = 20_000;

/** The engine's answer, or `confirm` once it fails or misses the deadline. */
export function leaveDecisionWithin(decision: Promise<LeaveDecision>): Promise<LeaveDecision> {
  return new Promise((resolve) => {
    const deadline = setTimeout(() => resolve('confirm'), LEAVE_DECISION_DEADLINE_MS);
    void decision.then(resolve, () => resolve('confirm')).finally(() => clearTimeout(deadline));
  });
}

interface GuardedLocation {
  pathname: string;
  state?: unknown;
}

/**
 * Whether leaving now could lose content: the post diverges from the server, or
 * the engine still owes it a write that has not been acknowledged. A re-auth
 * freeze holds a captured command that no dirty content stands in for, so it
 * counts as work of its own.
 */
export function hasUnsavedWork(state: SaveEngineState, isDirty: boolean): boolean {
  if (isDirty) {
    return true;
  }
  return (
    state.kind === 'preparing' ||
    state.kind === 'saving' ||
    state.kind === 'pending-coalesced' ||
    state.kind === 'reauth-pending'
  );
}

/**
 * Whether a navigation is the session's own URL replace after a create rather
 * than a writer leaving: `/editor/post` (with or without its trailing slash) to
 * `/editor/post/:id`, carrying the session key so the same session survives the swap.
 */
export function isCreatedIdUrlSwap(
  current: GuardedLocation,
  next: GuardedLocation,
  postType: PostType,
  sessionKey: string,
): boolean {
  const newPath = `/editor/${postType}`;
  if (
    withoutTrailingSlash(current.pathname) !== newPath ||
    !next.pathname.startsWith(`${newPath}/`)
  ) {
    return false;
  }
  const id = next.pathname.slice(newPath.length + 1);
  if (!id || id.includes('/')) {
    return false;
  }
  const state = next.state as { editorSession?: string } | null | undefined;
  return state?.editorSession === sessionKey;
}
