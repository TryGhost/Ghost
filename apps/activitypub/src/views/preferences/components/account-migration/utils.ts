export const HANDLE_REGEX = /^@?[^@\s]+@[^@\s]+$/;

export function normalizeHandle(handle: string) {
  const trimmedHandle = handle.trim();

  return trimmedHandle.startsWith('@') ? trimmedHandle : `@${trimmedHandle}`;
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

export function getAliasErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    if (error.statusCode === 400) {
      return 'Enter a valid handle, like old@mastodon.social.';
    }

    if (error.statusCode === 404) {
      return 'Could not find that profile. Check the handle and try again.';
    }
  }

  return 'Something went wrong, please try again.';
}
