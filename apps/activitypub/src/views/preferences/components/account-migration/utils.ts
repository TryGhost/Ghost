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

/** Only returns a value when the actor URI looks like a Mastodon-style handle we can put in the field. */
export function getPrefillableHandle(actorUri: string) {
  const display = getAliasDisplayHandle(actorUri);

  return HANDLE_REGEX.test(display) ? display : null;
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
        return 'Enter a valid destination handle.';
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
