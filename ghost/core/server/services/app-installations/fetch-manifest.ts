import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import type { AppFetchFailure, FetchFromApp } from './fetch-from-app';

// The manifest is stored in a TEXT column, so anything larger could not be kept anyway.
const MANIFEST_MAX_BYTES = 64 * 1024;

interface FetchedManifest {
  /**
   * Where the manifest was finally read from, after any redirects on the same host. Its
   * relative URLs resolve against this, as they would in a browser.
   */
  url: string;
  body: unknown;
}

type FetchManifest = (manifestUrl: string) => Promise<FetchedManifest>;

// Says only how the app answered, never why any other request failed, so the preview
// can't be used to probe the server's network. The reason is logged, so an operator can
// still tell a timeout from a certificate problem.
function unreachable(
  manifestUrl: string,
  failure: Extract<AppFetchFailure, { reason: 'unreachable' | 'location_not_url' }>,
  logging: Pick<GhostLogger, 'warn'>,
): errors.ValidationError {
  let context = manifestUrl;
  if (failure.reason === 'location_not_url') {
    context = `${manifestUrl} answered with HTTP ${failure.status} and a Location that is not a URL`;
  } else if (failure.status) {
    context = `${manifestUrl} answered with HTTP ${failure.status}`;
  }
  logging.warn(`Could not load the app manifest at ${manifestUrl}`);
  // A Location that isn't a URL has no cause beyond the answer, so the answer is logged.
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
      return unreachable(manifestUrl, failure, logging);
    case 'redirected':
      return new errors.ValidationError({
        message: 'The app’s manifest redirects to another host.',
        code: 'APP_MANIFEST_REDIRECTED',
        context: `${manifestUrl} redirects to ${failure.host}`,
      });
    case 'too_large':
      return new errors.ValidationError({
        message: `The app’s manifest is larger than ${MANIFEST_MAX_BYTES / 1024} KB.`,
        code: 'APP_MANIFEST_TOO_LARGE',
        context: manifestUrl,
      });
  }
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
    const fetched = await fetchFromApp(manifestUrl, {
      accept: 'application/json',
      maxBytes: MANIFEST_MAX_BYTES,
    });
    if (!fetched.success) {
      throw manifestError(manifestUrl, fetched.failure, logging);
    }

    // Decoded as UTF-8, which is what JSON should use, whatever charset the app names. A
    // byte order mark is valid at the start of a JSON file, but JSON.parse rejects it.
    const text = fetched.body.toString('utf8');
    try {
      return {
        url: fetched.url,
        body: JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text),
      };
    } catch {
      throw new errors.ValidationError({
        message: 'The app’s manifest is not JSON.',
        code: 'APP_MANIFEST_NOT_JSON',
        context: manifestUrl,
      });
    }
  };
}
