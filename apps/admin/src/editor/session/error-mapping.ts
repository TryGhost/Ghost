import {
  APIError,
  HostLimitError,
  JSONError,
  MaintenanceError,
  RequestEntityTooLargeError,
  ServerUnreachableError,
  SessionExpiredError,
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
// Core's email service has no newsletter to send to; its own sentence names a model relation.
const MISSING_NEWSLETTER = 'The post does not have a newsletter relation';
export const MISSING_NEWSLETTER_MESSAGE =
  'This post’s newsletter couldn’t be found. Choose another newsletter and try again.';

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
  if (error instanceof SessionExpiredError || error instanceof UnauthorizedError) {
    return true;
  }
  const code = status(error);
  return code === 401 || (code === 403 && apiErrorBody(error)?.message === 'Authorization failed');
}

/**
 * The transport names the endpoint when a response carries no reason it recognises
 * ("Something went wrong while loading posts"), which says nothing about a save.
 */
function isTransportSummary(error: APIError): boolean {
  return error.message === new APIError(error.response).message;
}

/**
 * Core's reason for a failed request, or null when the response gave none. Core's
 * error handler rewrites `message` to a generic summary ("Error sending email!") and
 * moves its own sentence into `context`, so the context is preferred.
 */
export function apiErrorReason(error: unknown): string | null {
  const body = apiErrorBody(error);
  const context = body?.context?.trim();
  if (context) {
    return context.startsWith(MISSING_NEWSLETTER) ? MISSING_NEWSLETTER_MESSAGE : context;
  }
  return body?.message?.trim() || null;
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * What a failed request tells the writer: Core's reason when it gave one, the error's
 * own message otherwise, and `fallback` rather than the transport's endpoint summary.
 */
export function requestFailureMessage(error: unknown, fallback: string): string {
  const reason = apiErrorReason(error);
  if (reason) {
    return reason;
  }
  if (error instanceof APIError && isTransportSummary(error)) {
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
