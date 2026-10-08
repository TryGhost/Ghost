import {
  APIError,
  HostLimitError,
  ServerUnreachableError,
} from '@tryghost/admin-x-framework/errors';
import {
  UNEXPECTED_ERROR_MESSAGE,
  isSessionInvalid,
  requestFailureMessage,
} from '@/editor/session/error-mapping';
import { splitUpgradeMessage } from './publish-options';
import type { LimitMessagePart } from './publish-options';
import type { SaveCompletion, SaveError } from '@/editor/engine/save-engine';

/** A request that never reached the server, a save's or any other. */
export const UNREACHABLE_MESSAGE =
  'Couldn’t reach the server. Check your connection and try again.';
export const CONFLICT_MESSAGE =
  'Someone else has edited this post since you opened it. Reload the editor to get their changes before publishing.';
export const REAUTH_MESSAGE = 'Your session was restored. Confirm again to publish.';
export const SESSION_ABANDONED_MESSAGE =
  'Your session expired. Confirm again to sign in and publish.';
/**
 * A request that met an expired session, once sign-in was abandoned: a read or request
 * outside a save, or a save that changed the post's status.
 */
export const SESSION_EXPIRED_MESSAGE = 'Your session expired. Try again to sign in.';
/** The same, beside a Retry that signs in again: a failed save or the publish settings. */
export const SESSION_EXPIRED_RETRY_MESSAGE = 'Your session expired. Retry to sign in again.';
export const RETRY_ELIGIBILITY_FAILED_MESSAGE =
  'Could not check whether this email can be retried. Please try checking again.';
export const UNEXPECTED_MESSAGE = 'Something went wrong while saving. Please try again.';
export const DROPPED_MESSAGE = 'This post can no longer be published from here. Reload the editor.';
export const HALTED_MESSAGE =
  'This post can no longer be published from here. It may have been deleted, or you may no longer have access to it.';
export const DELETED_MESSAGE =
  'This post has been deleted, so it can’t be published. Copy anything you want to keep before leaving the editor.';

export interface CompletionFailure {
  message: string;
  /** Set for a host limit, so "please upgrade" can be rendered as a link. */
  parts?: LimitMessagePart[];
  /** `info` is a note on what to do next, not an error: nothing failed. */
  tone?: 'info';
}

/**
 * Carries a described failure through a promise rejection, so a caller that
 * rejects with it (the editor's pre-publish save) keeps the structured copy,
 * host-limit link included, instead of flattening it to `message`.
 */
export class CompletionFailureError extends Error {
  readonly failure: CompletionFailure;

  constructor(failure: CompletionFailure) {
    super(failure.message);
    this.name = 'CompletionFailureError';
    this.failure = failure;
  }
}

/** A host limit's copy, split so its upgrade phrase can be linked. */
export function hostLimitFailure(message: string): CompletionFailure {
  return { message, parts: splitUpgradeMessage(message) };
}

/**
 * Turns a rejected promise into safe inline copy. A refusal from Core is read for
 * the reason it gave; `fallback` stands in for a failure Core gave no reason for, a
 * 5xx and the transport's summary of the request included.
 */
export function describeRejectedAction(
  error: unknown,
  fallback: string = UNEXPECTED_ERROR_MESSAGE,
): CompletionFailure {
  if (error instanceof CompletionFailureError) {
    return error.failure;
  }

  if (error instanceof ServerUnreachableError) {
    return { message: UNREACHABLE_MESSAGE };
  }

  if (isSessionInvalid(error)) {
    return { message: SESSION_EXPIRED_MESSAGE };
  }

  if (error instanceof APIError) {
    const message = requestFailureMessage(error, fallback);
    return error instanceof HostLimitError ? hostLimitFailure(message) : { message };
  }

  if (error instanceof Error && error.message) {
    return { message: error.message };
  }

  if (typeof error === 'string' && error) {
    return { message: error };
  }

  return { message: fallback };
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
    return { message: REAUTH_MESSAGE, tone: 'info' };
  }

  // A halted engine stopped on a deleted post or lost access; reloading cannot fix either.
  if (completion.kind === 'dropped' && completion.reason === 'halted') {
    return { message: HALTED_MESSAGE };
  }

  if (completion.kind === 'dropped' || completion.kind === 'superseded') {
    return { message: DROPPED_MESSAGE };
  }

  if (completion.kind === 'failed' && completion.error.kind === 'not-found') {
    return { message: DELETED_MESSAGE };
  }

  return describeSaveError(completion.error);
}

/** A failed save's message as the writer reads it. */
export function writerMessage(error: SaveError): string {
  // An exception's own text is for developers; an API error's message is written for people.
  if (
    error.kind === 'unknown' &&
    error.cause instanceof Error &&
    !(error.cause instanceof APIError)
  ) {
    return UNEXPECTED_MESSAGE;
  }
  return error.message;
}

/** Turns the error a save failed with into inline copy. */
export function describeSaveError(error: SaveError): CompletionFailure {
  switch (error.kind) {
    case 'validation':
      return {
        message: error.message ? `Validation failed: ${error.message}` : UNEXPECTED_ERROR_MESSAGE,
      };
    case 'transport':
      return { message: UNREACHABLE_MESSAGE };
    case 'conflict':
      return { message: CONFLICT_MESSAGE };
    case 'session-invalid':
      return { message: SESSION_ABANDONED_MESSAGE };
    case 'host-limit':
      return hostLimitFailure(error.message || UNEXPECTED_ERROR_MESSAGE);
    default:
      return { message: writerMessage(error) || UNEXPECTED_ERROR_MESSAGE };
  }
}
