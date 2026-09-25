import * as Sentry from '@sentry/react';
import { APIError, ServerUnreachableError } from '@tryghost/admin-x-framework/errors';
import type { PostType } from '@/editor/card-config';
import type { SaveError } from '@/editor/engine/save-engine';
import type { EditorLeaveConfirmation, EditorSaveFailure } from '@/editor/session/editor-session';

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

/** Reports a Lexical failure from any of the editor's Koenig instances. */
export function reportKoenigError(error: unknown): void {
  reportEditorError(error, {
    tags: { lexical: true },
    contexts: { koenig: { version: window['@tryghost/koenig-lexical']?.version } },
  });
}

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

/**
 * Reports a request that settled as failed. Validation, host limits and an
 * unreachable server are the writer's or the host's to act on and are not
 * reported; every other failure is, once, with what the request was.
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

  if (
    error.kind === 'validation' ||
    error.kind === 'host-limit' ||
    error.cause instanceof ServerUnreachableError
  ) {
    return;
  }

  if (error.kind === 'not-found' && persisted) {
    Sentry.captureMessage(`Attempted to edit deleted ${postType}`, {
      tags,
      extra: { post_id: postId },
    });
    return;
  }

  reportEditorError(error.cause ?? new Error(error.message), {
    tags,
    extra: { post_id: postId, duration_ms: durationMs },
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
    extra: { post_id: leave.postId, reasons: leave.reasons },
  });
}
