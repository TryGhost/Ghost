import { isApiError } from '@src/api/activitypub';

export const HANDLE_REGEX = /^@?[^@\s]+@[^@\s]+$/;

export function normalizeHandle(handle: string) {
  const trimmedHandle = handle.trim();

  return trimmedHandle.startsWith('@') ? trimmedHandle : `@${trimmedHandle}`;
}

export function handlesEqual(left: string, right: string) {
  return normalizeHandle(left).toLowerCase() === normalizeHandle(right).toLowerCase();
}

export function getAliasDisplayHandle(actorUri: string) {
  try {
    const url = new URL(actorUri);
    const mastodonUserMatch = url.pathname.match(/^\/users\/([^/]+)\/?$/);

    if (mastodonUserMatch) {
      return `${decodeURIComponent(mastodonUserMatch[1])}@${url.hostname}`;
    }

    return `${url.hostname}${url.pathname}`;
  } catch {
    return actorUri;
  }
}
/**
 * `unknown` covers loading and temporary failures: don't promise outbound moves
 * yet, but keep the Export tab reachable so it can show its loading and retry states.
 */
export type OutboundMigrationAvailability = 'available' | 'unavailable' | 'unknown';

// An older ActivityPub service without the migration API, or a staff user who isn't the Owner
const UNAVAILABLE_STATUS_CODES = [401, 403, 404, 405, 501];

export function getOutboundMigrationAvailability(migration: {
  data?: unknown;
  error: unknown;
}): OutboundMigrationAvailability {
  if (
    isApiError(migration.error) &&
    UNAVAILABLE_STATUS_CODES.includes(migration.error.statusCode)
  ) {
    return 'unavailable';
  }

  return migration.data ? 'available' : 'unknown';
}

export function getAliasErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.statusCode === 400) {
      return 'Enter a valid handle, like old@mastodon.social.';
    }

    if (error.statusCode === 404) {
      return 'Could not find that profile. Check the handle and try again.';
    }
  }

  return 'Something went wrong, please try again.';
}

export function getMoveErrorMessage(error: unknown) {
  if (isApiError(error)) {
    switch (error.statusCode) {
      case 400:
        return error.code === 'SELF_MOVE'
          ? 'Enter a different account than this Ghost account.'
          : 'Enter a valid destination handle.';
      case 404:
        return 'Could not find the destination profile. Check its handle and try again.';
      case 409:
        return 'A move is already in progress or was sent to a different account.';
      case 422:
        return 'Add this Ghost account as an alias on the destination profile first.';
    }
  }

  return 'Could not send the migration. Try again later.';
}
