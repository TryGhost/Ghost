import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import type { AppIcon } from '@tryghost/app-contracts/manifest';
import type { AppFetchFailure, FetchFromApp } from './fetch-from-app';

// Fits a detailed logo; most icons are under 2 KB. Every copy goes to Admin with the
// installations list on each page load.
const ICON_MAX_BYTES = 16 * 1024;
// Only image types, so the data URL is always drawn as an image: a browser shows an SVG
// image without running its scripts or loading anything it references.
const ICON_TYPES = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif', 'image/webp']);

/** A copy of an app's own icon as a data URL, or null for a named icon. */
export type FetchIcon = (icon: AppIcon) => Promise<string | null>;

/** Reported as an invalid manifest so the install screen lists it with the other problems. */
function invalidIcon(message: string) {
  return new errors.ValidationError({
    message: 'The app manifest is not valid.',
    code: 'APP_MANIFEST_INVALID',
    context: `icon.url: ${message}`,
    errorDetails: [{ path: 'icon.url', message }],
  });
}

function iconError(
  iconUrl: string,
  failure: AppFetchFailure,
  logging: Pick<GhostLogger, 'warn'>,
): errors.ValidationError {
  switch (failure.reason) {
    case 'unreachable':
      // Log the cause, but only show the status: the cause can reveal internal network details.
      logging.warn(`Could not load the app icon at ${iconUrl}`);
      logging.warn(failure.cause);
      return invalidIcon(
        failure.status
          ? `Expected an icon that loads, not HTTP ${failure.status}`
          : 'Expected an icon that loads',
      );
    case 'location_not_url':
      logging.warn(`Could not load the app icon at ${iconUrl}`);
      logging.warn(
        `${iconUrl} answered with HTTP ${failure.status} and a Location that is not a URL`,
      );
      return invalidIcon(`Expected an icon that loads, not HTTP ${failure.status}`);
    case 'redirected':
      return invalidIcon(`Expected an icon on its own host, not a redirect to ${failure.host}`);
    case 'too_large':
      return invalidIcon(`Expected an icon of at most ${ICON_MAX_BYTES / 1024} KB`);
  }
}

/**
 * Fetches an app's icon on the server and returns a copy as a data URL, so staff browsers
 * never request it from the app. Uses the manifest's fetch rules (see `createAppFetcher`).
 *
 * The copy isn't sanitized: Admin only draws it as an image, which can't run scripts or
 * make requests. Don't inline an SVG copy into a page.
 *
 * Problems are thrown as `APP_MANIFEST_INVALID` at `icon.url`, since a broken icon blocks the
 * install like a broken manifest.
 */
export function createIconFetcher({
  fetchFromApp,
  logging,
}: {
  fetchFromApp: FetchFromApp;
  logging: Pick<GhostLogger, 'warn'>;
}): FetchIcon {
  return async function fetchIcon(icon) {
    if (!('url' in icon)) {
      return null;
    }
    const fetched = await fetchFromApp(icon.url, {
      accept: [...ICON_TYPES].join(', '),
      maxBytes: ICON_MAX_BYTES,
    });
    if (!fetched.success) {
      throw iconError(icon.url, fetched.failure, logging);
    }
    // Parameters such as `charset` are dropped: the data URL holds the bytes as they came.
    const type = fetched.contentType?.split(';')[0].trim().toLowerCase();
    if (!type || !ICON_TYPES.has(type)) {
      throw invalidIcon('Expected an SVG, PNG, JPEG, GIF or WebP image');
    }
    return `data:${type};base64,${fetched.body.toString('base64')}`;
  };
}
