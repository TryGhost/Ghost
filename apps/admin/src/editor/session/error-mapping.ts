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
  getErrorMessage,
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
// Core refuses `scheduled` for a post published since with this ValidationError context,
// raised before the collision check could see the stale updated_at.
const ALREADY_PUBLISHED = 'Your post is already published, please reload your page.';
// Core refuses an edit with this once the writer's role no longer covers the post.
const NO_PERMISSION = 'NoPermissionError';

function apiErrorCode(error: unknown): string | undefined {
  return error instanceof JSONError ? (error.data?.errors?.[0]?.code ?? undefined) : undefined;
}

function isNoPermission(error: unknown): boolean {
  return error instanceof JSONError && error.data?.errors?.[0]?.type === NO_PERMISSION;
}

function isAlreadyPublished(error: unknown): boolean {
  const body = error instanceof JSONError ? error.data?.errors?.[0] : undefined;
  return body?.type === 'ValidationError' && body.context === ALREADY_PUBLISHED;
}

function status(error: unknown): number | undefined {
  return error instanceof APIError ? error.response?.status : undefined;
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Maps a transport failure onto the save engine's error kinds. */
export function toSaveError(error: unknown, fallback: string): SaveError {
  const kind = ((): SaveError['kind'] => {
    if (apiErrorCode(error) === COLLISION_CODE || isAlreadyPublished(error)) {
      return 'conflict';
    }
    if (error instanceof SessionExpiredError || error instanceof UnauthorizedError) {
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
    if (code === 401) {
      return 'session-invalid';
    }
    if (code === 404) {
      return 'not-found';
    }
    if (code === 422) {
      return 'validation';
    }
    return 'unknown';
  })();

  // Core's reason for a refusal is in the body's `context`; its `message` is a generic summary.
  const message =
    kind === 'validation' || kind === 'host-limit' || kind === 'forbidden'
      ? getErrorMessage(error, messageOf(error, fallback))
      : messageOf(error, fallback);
  return { kind, message, cause: error };
}
