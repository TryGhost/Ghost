import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import type { AppFetchFailure, FetchFromApp } from './fetch-from-app';

// The manifest is stored in a TEXT column, so anything larger could not be kept anyway.
export const MANIFEST_MAX_BYTES = 64 * 1024;

// The signed manifest carries the manifest in base64url, a third larger, with a header and
// signature well under a kilobyte, so a manifest of the largest size still fits.
const SIGNED_MANIFEST_MAX_BYTES = Math.ceil((MANIFEST_MAX_BYTES * 4) / 3) + 1024;

/** The signed manifest's JSON, as the app served it. */
type FetchManifest = (manifestUrl: string) => Promise<unknown>;

// Says only how the app answered, never why any other request failed, so the preview
// can't be used to probe the server's network. The reason is logged, so an operator can
// still tell a timeout from a certificate problem.
function unreachable(
  manifestUrl: string,
  failure: Extract<
    AppFetchFailure,
    { reason: 'unreachable' | 'location_not_url' | 'redirect_refused' }
  >,
  logging: Pick<GhostLogger, 'warn'>,
): errors.ValidationError {
  let context = manifestUrl;
  if (failure.reason === 'location_not_url') {
    context = `${manifestUrl} answered with HTTP ${failure.status} and a Location that is not a URL`;
  } else if (failure.status) {
    context = `${manifestUrl} answered with HTTP ${failure.status}`;
  }
  logging.warn(`Could not load the app manifest at ${manifestUrl}`);
  // A refused redirect has no cause beyond the answer, so the answer is logged.
  logging.warn(failure.reason === 'unreachable' ? failure.cause : context);
  return new errors.ValidationError({
    message: 'Could not load the app’s manifest.',
    code: 'APP_MANIFEST_UNREACHABLE',
    context,
  });
}

function manifestError(
  manifestUrl: string,
  failure: AppFetchFailure,
  logging: Pick<GhostLogger, 'warn'>,
): errors.ValidationError {
  switch (failure.reason) {
    case 'unreachable':
    case 'location_not_url':
    case 'redirect_refused':
      return unreachable(manifestUrl, failure, logging);
    case 'redirected':
      return new errors.ValidationError({
        message: 'The app’s manifest redirects to another host.',
        code: 'APP_MANIFEST_REDIRECTED',
        context: `${manifestUrl} redirects to ${failure.host}`,
      });
    case 'too_large':
      return manifestTooLarge(manifestUrl);
  }
}

export function manifestTooLarge(manifestUrl: string): errors.ValidationError {
  return new errors.ValidationError({
    message: `The app’s manifest is larger than ${MANIFEST_MAX_BYTES / 1024} KB.`,
    code: 'APP_MANIFEST_TOO_LARGE',
    context: manifestUrl,
  });
}

/**
 * Fetches an app's manifest server-side, so a manifest is never taken from the browser.
 * `createAppFetcher` describes the redirect, alias, time and size rules it is read with.
 */
export function createManifestFetcher({
  fetchFromApp,
  logging,
}: {
  fetchFromApp: FetchFromApp;
  logging: Pick<GhostLogger, 'warn'>;
}): FetchManifest {
  return async function fetchManifest(manifestUrl) {
    // The text is decoded as UTF-8, which is what JSON should use.
    const fetched = await fetchFromApp(manifestUrl, {
      maxBytes: SIGNED_MANIFEST_MAX_BYTES,
      headers: { accept: 'application/json' },
    });
    if (!fetched.success) {
      throw manifestError(manifestUrl, fetched.failure, logging);
    }

    return parseJson(fetched.text, manifestUrl);
  };
}

/**
 * Parses JSON the app served: the signed manifest, or the manifest inside it. A byte order
 * mark is valid at the start of a JSON file, but JSON.parse rejects it.
 */
export function parseJson(text: string, manifestUrl: string): unknown {
  try {
    return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    throw new errors.ValidationError({
      message: 'The app’s manifest is not JSON.',
      code: 'APP_MANIFEST_NOT_JSON',
      context: manifestUrl,
    });
  }
}
