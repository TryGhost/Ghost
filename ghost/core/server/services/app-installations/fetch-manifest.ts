import {
  APP_LOAD_MESSAGES,
  SIGNED_MANIFEST_MAX_BYTES,
  parseJsonText,
} from '@tryghost/app-contracts/identity';
import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import type { AppFetchFailure, FetchFromApp } from './fetch-from-app';

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
    message: APP_LOAD_MESSAGES.APP_MANIFEST_UNREACHABLE,
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
        message: APP_LOAD_MESSAGES.APP_MANIFEST_REDIRECTED,
        code: 'APP_MANIFEST_REDIRECTED',
        context: `${manifestUrl} redirects to ${failure.host}`,
      });
    case 'too_large':
      return manifestTooLarge(manifestUrl);
  }
}

export function manifestTooLarge(manifestUrl: string): errors.ValidationError {
  return new errors.ValidationError({
    message: APP_LOAD_MESSAGES.APP_MANIFEST_TOO_LARGE,
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
    const fetched = await fetchFromApp(manifestUrl, {
      maxBytes: SIGNED_MANIFEST_MAX_BYTES,
      headers: { accept: 'application/json' },
    });
    if (!fetched.success) {
      throw manifestError(manifestUrl, fetched.failure, logging);
    }

    // Decoded as UTF-8, which is what JSON should use, whatever charset the app names.
    return parseJson(fetched.body.toString('utf8'), manifestUrl);
  };
}

/** Parses JSON the app served: the signed manifest, or the manifest inside it. */
export function parseJson(text: string, manifestUrl: string): unknown {
  try {
    return parseJsonText(text);
  } catch {
    throw new errors.ValidationError({
      message: APP_LOAD_MESSAGES.APP_MANIFEST_NOT_JSON,
      code: 'APP_MANIFEST_NOT_JSON',
      context: manifestUrl,
    });
  }
}
