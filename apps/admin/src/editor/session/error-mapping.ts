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
import type { SaveError } from '@/editor/engine/save-engine';

// @tryghost/bookshelf-collision rejects a stale updated_at with this code.
const COLLISION_CODE = 'UPDATE_COLLISION';

function apiErrorCode(error: unknown): string | undefined {
  return error instanceof JSONError ? (error.data?.errors?.[0]?.code ?? undefined) : undefined;
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
    if (apiErrorCode(error) === COLLISION_CODE) {
      return 'conflict';
    }
    if (error instanceof SessionExpiredError || error instanceof UnauthorizedError) {
      return 'session-invalid';
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

  return { kind, message: messageOf(error, fallback), cause: error };
}
