import * as Sentry from '@sentry/react';
import type { ErrorInfo } from 'react';
import {
  APIError,
  JSONError,
  ServerUnreachableError,
  getErrorMessage,
} from '@tryghost/admin-x-framework/errors';
import { loadedKoenigVersion } from '@/settings/components/koenig-loader';
import type { PostType } from '@/editor/card-config';
import type { SaveError } from '@/editor/engine/save-engine';
import type { EditorLeaveConfirmation, EditorSaveFailure } from '@/editor/session/editor-session';
import { toSaveError } from '@/editor/session/error-mapping';

type TagValue = boolean | number | string;

export interface EditorErrorContext {
  tags?: Record<string, TagValue>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, Record<string, unknown>>;
}

/** A failed save is slow past this; Sentry gets a second event with its timing. */
const SLOW_SAVE_MS = 2000;

/**
 * Reports an editor failure. Never rethrown: the editor recovers without losing
 * what the writer typed.
 */
export function reportEditorError(error: unknown, context?: EditorErrorContext): void {
  // eslint-disable-next-line no-console
  console.error(error);

  Sentry.captureException(error, context);
}

/** Reports a recovery the editor made on its own, as a message rather than a fault. */
export function reportEditorNotice(message: string, context?: EditorErrorContext): void {
  Sentry.captureMessage(message, context);
}

/** The post editor's visible Koenig instance, or the hidden one its change baseline comes from. */
export type KoenigInstanceRole = 'primary' | 'secondary';

export interface KoenigErrorReporters {
  onError: (error: unknown) => void;
  onRenderError: (error: unknown, info: ErrorInfo) => void;
}

/**
 * Reports Lexical failures from a Koenig instance, tagged with its role when it has one.
 * The role is bound here because Lexical passes its editor as onError's second argument.
 */
export function koenigErrorReporters(instance?: KoenigInstanceRole): KoenigErrorReporters {
  const context = (contexts?: EditorErrorContext['contexts']): EditorErrorContext => ({
    tags: definedTags({ lexical: true, koenig_instance: instance }),
    contexts: { koenig: { version: loadedKoenigVersion() }, ...contexts },
  });

  return {
    onError: (error) => reportEditorError(error, context()),
    onRenderError: (error, info) =>
      reportEditorError(error, context({ react: { componentStack: info.componentStack } })),
  };
}

const anyKoenigInstance = koenigErrorReporters();

/** Reports a Lexical failure from any of the editor's Koenig instances. */
export const reportKoenigError = anyKoenigInstance.onError;

/** Reports a Koenig instance that crashed its error boundary, with where in the tree. */
export const reportKoenigRenderError = anyKoenigInstance.onRenderError;

function definedTags(tags: Record<string, TagValue | undefined>): Record<string, TagValue> {
  return Object.fromEntries(
    Object.entries(tags).filter(([, value]) => value !== undefined),
  ) as Record<string, TagValue>;
}

/** The response behind a failure, when the transport answered at all. */
function responseTags(error: SaveError): Record<string, TagValue | undefined> {
  const response = error.cause instanceof APIError ? error.cause.response : undefined;
  return {
    api_response_status: response?.status,
    // Sentry drops a tag value longer than 200 characters.
    api_url: response?.url ? response.url.slice(0, 200) : undefined,
  };
}

/** Core's account of a collision: the fields that changed and both `updated_at` values. */
function collisionExtra(error: SaveError): { collision?: unknown } {
  const details =
    error.kind === 'conflict' && error.cause instanceof JSONError
      ? error.cause.data?.errors[0]?.details
      : null;
  return details ? { collision: details } : {};
}

/** Sentry titles and groups a failure by this error's name; the transport error is its cause. */
function saveFailureError(error: SaveError): Error {
  const kind = error.kind.replace(/(?:^|-)(\w)/g, (_, letter: string) => letter.toUpperCase());
  const reported = new Error(getErrorMessage(error.cause, error.message), { cause: error.cause });
  reported.name = `Save${kind}Error`;
  return reported;
}

/**
 * Whether a failure is not a fault in the editor, and so is not reported as one: a refusal
 * the writer reads and acts on (validation, a host limit, a writer who lost access
 * to the post, an expired session, whose recovery is signing in again) or a
 * connection that never reached the server. A missing post, a collision, a 5xx, a
 * timeout, maintenance and anything unrecognised are reported. Saves and the publish
 * flow both read this.
 */
export function isExpectedSaveError(error: SaveError): boolean {
  return (
    error.kind === 'validation' ||
    error.kind === 'host-limit' ||
    error.kind === 'forbidden' ||
    error.kind === 'session-invalid' ||
    error.cause instanceof ServerUnreachableError
  );
}

/** `isExpectedSaveError()` for a failure outside a save, read the way a save's would be. */
export function isExpectedFailure(error: unknown): boolean {
  return isExpectedSaveError(toSaveError(error, ''));
}

/**
 * Reports a request that settled as failed, unless it was expected
 * (`isExpectedSaveError()`): every other failure is reported once, with what the
 * request was. A writer who lost access or whose session expired is noted as a message.
 */
export function reportSaveFailure(failure: EditorSaveFailure, postType: PostType): void {
  const { command, error, persisted, durationMs, postId, status } = failure;
  const tags = definedTags({
    savePostTask: true,
    post_type: postType,
    save_intent: command.kind,
    save_error_kind: error.kind,
    save_persisted: persisted,
    save_status: status,
    ...responseTags(error),
  });

  if (durationMs !== null && durationMs > SLOW_SAVE_MS) {
    Sentry.captureException('Failed Lexical save took > 2s', {
      tags: definedTags({
        ...tags,
        save_time: Math.ceil(durationMs / 1000),
        save_revision: command.requiresRevision,
        email_segment: command.target?.emailSegment,
      }),
      extra: { post_id: postId },
    });
  }

  if (error.kind === 'forbidden' || error.kind === 'session-invalid') {
    reportEditorNotice(`Lost access while editing ${postType}`, {
      tags,
      extra: { post_id: postId },
    });
    return;
  }

  if (isExpectedSaveError(error)) {
    return;
  }

  if (error.kind === 'not-found' && persisted) {
    Sentry.captureMessage(`Attempted to edit deleted ${postType}`, {
      tags,
      extra: { post_id: postId },
    });
    return;
  }

  reportEditorError(saveFailureError(error), {
    tags,
    extra: { post_id: postId, duration_ms: durationMs, ...collisionExtra(error) },
  });
}

/** Reports an error banner the writer was shown, by the text they read. */
export function reportShownAlert(message: string, error: SaveError): void {
  Sentry.captureMessage(message, {
    tags: definedTags({
      shown_to_user: true,
      source: 'editor-banner',
      save_error_kind: error.kind,
      ...responseTags(error),
    }),
    contexts: { ghost: { displayed_message: message, save_error_message: error.message } },
  });
}

/** Reports a leave the writer had to confirm, with why the post counted as unsaved. */
export function reportLeaveConfirmation(leave: EditorLeaveConfirmation, postType: PostType): void {
  Sentry.captureMessage('showing leave editor modal', {
    tags: {
      post_type: postType,
      save_status: leave.status,
      engine_state: leave.engineState,
      leave_reasons: leave.reasons.join(','),
    },
    extra: {
      post_id: leave.postId,
      reasons: leave.reasons,
      dirty_fields: leave.dirtyFields,
      body_diff: leave.bodyDiff,
    },
  });
}
