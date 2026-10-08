import {
  APIError,
  EmailError,
  HostLimitError,
  JSONError,
  MaintenanceError,
  RequestEntityTooLargeError,
  ServerUnreachableError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
} from '@tryghost/admin-x-framework/errors';
import type { SaveEngineState, SaveError } from '@/editor/engine/save-engine';

/** What a halt on a post deleted elsewhere tells the writer. */
export const POST_DELETED: SaveError = {
  kind: 'not-found',
  message: 'This post has been deleted. Copy your content and paste it into a new post to keep it.',
};

/** What a halt on a writer who may no longer edit the post tells them. */
export const ACCESS_LOST: SaveError = {
  kind: 'forbidden',
  message:
    'You no longer have permission to edit this post. Copy your content to keep your changes.',
};

/** What a crash, a create the server answered with a 404, tells the writer. */
export const EDITOR_CRASHED: SaveError = {
  kind: 'not-found',
  message: 'The editor has crashed. Copy your content and paste it into a new post to keep it.',
};

/** What a state that takes no later save tells the writer, if the state is one. */
export function terminalSaveError(state: SaveEngineState): SaveError | null {
  if (state.kind === 'halted') {
    return state.error.kind === 'forbidden' ? ACCESS_LOST : POST_DELETED;
  }
  return state.kind === 'crashed' ? EDITOR_CRASHED : null;
}

/** The failed save an engine state reports, if it reports one. */
export function stateSaveError(state: SaveEngineState): SaveError | null {
  if (state.kind === 'error' || state.kind === 'conflict') {
    return state.error;
  }
  return terminalSaveError(state);
}

// @tryghost/bookshelf-collision rejects a stale updated_at with this code.
const COLLISION_CODE = 'UPDATE_COLLISION';
// Core's email service refuses a publish whose newsletter or audience changed under it with
// this type and no code.
const COLLISION_TYPE = 'UpdateCollisionError';
// Core refuses `scheduled` for a post published since with this ValidationError context,
// raised before the collision check could see the stale updated_at.
const ALREADY_PUBLISHED = 'Your post is already published, please reload your page.';
// Core refuses an edit with this once the writer's role no longer covers the post.
const NO_PERMISSION = 'NoPermissionError';

/** The preferred fallback for a failure the editor cannot explain (docs/practices/error-handling.md). */
export const UNEXPECTED_ERROR_MESSAGE = 'An unexpected error occurred, please try again.';

/**
 * What a publish Core's email service refused tells the writer. Within a request the
 * service throws an `EmailError` only when the post has no newsletter to send to
 * (`checkCanSendEmail` in ghost/core/core/server/services/email-service/email-service.js,
 * called by the post save's email handler), and gives it no code, so the class stands in
 * for that case rather than its sentence. Core's other `EmailError`s are thrown by the
 * background send job, after the request has answered, and reach the editor as the
 * email's failed status instead.
 */
export const EMAIL_REFUSED_MESSAGE =
  'The newsletter couldn’t be sent. Check the post’s newsletter and try again.';

function apiErrorBody(error: unknown) {
  return error instanceof JSONError ? error.data?.errors?.[0] : undefined;
}

function isNoPermission(error: unknown): boolean {
  return apiErrorBody(error)?.type === NO_PERMISSION;
}

function isAlreadyPublished(error: unknown): boolean {
  const body = apiErrorBody(error);
  return body?.type === 'ValidationError' && body.context === ALREADY_PUBLISHED;
}

function isCollision(error: unknown): boolean {
  const body = apiErrorBody(error);
  return (
    body?.code === COLLISION_CODE || body?.type === COLLISION_TYPE || isAlreadyPublished(error)
  );
}

function status(error: unknown): number | undefined {
  return error instanceof APIError ? error.response?.status : undefined;
}

/**
 * Whether a request failed because the writer's session is gone: signing in again is
 * the way back, and repeating the request without that only fails the same way.
 */
export function isSessionInvalid(error: unknown): boolean {
  // Core answers a session it no longer authorizes with a 403 whose only signal is the
  // message "Authorization failed" (a known Core limitation: no type or code). The
  // framework's response handler reads it once and throws `UnauthorizedError`, so the
  // editor reads the class rather than comparing the text again. `SessionExpiredError`
  // extends it.
  return error instanceof UnauthorizedError || status(error) === 401;
}

/**
 * Whether the error is the transport's bare `APIError` or `JSONError` carrying the summary
 * it generates when no message is given, which only names the endpoint ("Something went
 * wrong while loading posts"). A bare error built with an explicit message keeps it, and
 * every subclass carries a message of its own (a timeout, maintenance, a payload too large).
 *
 * The framework does not mark a generated summary, so the message is compared with the one
 * `APIError` generates for the same response: our own string, never Core's text.
 */
export function isTransportSummary(error: unknown): boolean {
  if (!(error instanceof APIError)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(error) as unknown;
  if (prototype !== APIError.prototype && prototype !== JSONError.prototype) {
    return false;
  }
  return error.message === new APIError(error.response).message;
}

/**
 * Core's reason for a refused request, or null when there is none to show. Only a 4xx
 * is a refusal Core words for the person (validation, a host limit, permissions, a bad
 * request such as an archived newsletter); a 5xx is a fault whose text is for logs, so
 * the caller's fallback stands in. Core's error handler rewrites `message` to a generic
 * summary and moves its own sentence into `context`, so the context is preferred.
 */
function apiErrorReason(error: unknown): string | null {
  if (error instanceof EmailError) {
    return EMAIL_REFUSED_MESSAGE;
  }
  const code = status(error);
  if (code === undefined || code < 400 || code >= 500) {
    return null;
  }
  const body = apiErrorBody(error);
  return nonBlank(body?.context) ?? nonBlank(body?.message);
}

/** The trimmed text, or null for blank text or a field that is not text at all. */
function nonBlank(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * What a failed request tells the writer: Core's reason for a refusal, the error's own
 * message when its class words one, and `fallback` for anything else, a 5xx included.
 */
export function requestFailureMessage(error: unknown, fallback: string): string {
  const reason = apiErrorReason(error);
  if (reason) {
    return reason;
  }
  if (isTransportSummary(error)) {
    return fallback;
  }
  return messageOf(error, fallback);
}

/** Maps a transport failure onto the save engine's error kinds. */
export function toSaveError(error: unknown, fallback: string): SaveError {
  const kind = ((): SaveError['kind'] => {
    if (isCollision(error)) {
      return 'conflict';
    }
    if (isSessionInvalid(error)) {
      return 'session-invalid';
    }
    // Read before the ValidationError check: the framework classes this refusal as one.
    if (isNoPermission(error)) {
      return 'forbidden';
    }
    if (error instanceof HostLimitError) {
      return 'host-limit';
    }
    if (
      error instanceof ServerUnreachableError ||
      error instanceof MaintenanceError ||
      error instanceof TimeoutError
    ) {
      return 'transport';
    }
    // A payload the server refuses outright must suppress background saves the
    // same way a validation failure does, or it retries on every edit.
    if (error instanceof ValidationError || error instanceof RequestEntityTooLargeError) {
      return 'validation';
    }
    const code = status(error);
    if (code === 404) {
      return 'not-found';
    }
    if (code === 422) {
      return 'validation';
    }
    return 'unknown';
  })();

  // An expired session and an unreachable server are worded by their own classes.
  const message =
    kind === 'session-invalid' || kind === 'transport'
      ? messageOf(error, fallback)
      : requestFailureMessage(error, fallback);
  return { kind, message, cause: error };
}
