import { splitUpgradeMessage } from './publish-options';
import type { LimitMessagePart } from './publish-options';
import type { SaveCompletion } from '@/editor/engine/save-engine';

export const UNREACHABLE_MESSAGE =
  'Unable to connect, please check your internet connection and try again.';
export const CONFLICT_MESSAGE =
  'Someone else has edited this post since you opened it. Reload the editor to get their changes before publishing.';
export const REAUTH_MESSAGE =
  'Your session expired. Sign in again in a new tab, then try publishing again.';
export const UNKNOWN_MESSAGE = 'Unknown Error';
export const DROPPED_MESSAGE = 'This post can no longer be published from here. Reload the editor.';

export interface CompletionFailure {
  message: string;
  /** Set for a host limit, so "please upgrade" can be rendered as a link. */
  parts?: LimitMessagePart[];
}

/** Turns an unexpected rejected promise into safe inline copy. */
export function describeRejectedAction(error: unknown): CompletionFailure {
  if (error instanceof Error && error.message) {
    return { message: error.message };
  }

  if (typeof error === 'string' && error) {
    return { message: error };
  }

  return { message: UNKNOWN_MESSAGE };
}

/**
 * Turns a non-success completion into the confirm step's inline error.
 * Ported from `publish-flow/confirm.js` :108-138, re-expressed over the
 * engine's completion kinds rather than raw transport errors.
 */
export function describeCompletionFailure(completion: SaveCompletion): CompletionFailure | null {
  if (completion.kind === 'saved') {
    return null;
  }

  if (completion.kind === 'needs-retry') {
    return { message: REAUTH_MESSAGE };
  }

  if (completion.kind === 'dropped' || completion.kind === 'superseded') {
    return { message: DROPPED_MESSAGE };
  }

  const { error } = completion;

  switch (error.kind) {
    case 'validation':
      return { message: `Validation failed: ${error.message || UNKNOWN_MESSAGE}` };
    case 'transport':
      return { message: UNREACHABLE_MESSAGE };
    case 'conflict':
      return { message: CONFLICT_MESSAGE };
    case 'session-invalid':
      return { message: REAUTH_MESSAGE };
    case 'host-limit':
      return {
        message: error.message || UNKNOWN_MESSAGE,
        parts: splitUpgradeMessage(error.message || UNKNOWN_MESSAGE),
      };
    default:
      return { message: error.message || UNKNOWN_MESSAGE };
  }
}
