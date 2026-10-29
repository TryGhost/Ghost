import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import type { AppIcon } from '@tryghost/app-contracts/manifest';
import type { AppFetchFailure, FetchFromApp } from './fetch-from-app';

// Fits a detailed logo; most icons are under 2 KB. Every copy goes to Admin with the
// installations list on each page load. Checked before and after sanitizing, which can
// make an SVG larger.
const ICON_MAX_BYTES = 16 * 1024;
// jsdom's parse time grows with the square of the nesting depth, and a few thousand levels
// overflow the stack. Counting start tags caps the depth before parsing. Real icons rarely
// have more than a few dozen elements.
const ICON_MAX_ELEMENTS = 500;
const START_TAG = /<[a-z]/gi;

/** Returns the sanitized SVG, or null if it isn't one. */
export type SanitizeSvg = (svg: string) => string | null;

/** The sanitized SVG for an app's own icon, or null for a named icon. */
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
 * Fetches an app's SVG icon on the server and returns a sanitized copy, so staff browsers
 * never request it from the app. Uses the manifest's fetch rules (see `createAppFetcher`).
 *
 * Problems are thrown as `APP_MANIFEST_INVALID` at `icon.url`, since a broken icon blocks the
 * install like a broken manifest.
 */
export function createIconFetcher({
  fetchFromApp,
  logging,
  sanitizeSvg,
}: {
  fetchFromApp: FetchFromApp;
  logging: Pick<GhostLogger, 'warn'>;
  sanitizeSvg: SanitizeSvg;
}): FetchIcon {
  return async function fetchIcon(icon) {
    if (!('url' in icon)) {
      return null;
    }
    const fetched = await fetchFromApp(icon.url, {
      accept: 'image/svg+xml',
      maxBytes: ICON_MAX_BYTES,
    });
    if (!fetched.success) {
      throw iconError(icon.url, fetched.failure, logging);
    }
    if ((fetched.text.match(START_TAG)?.length ?? 0) > ICON_MAX_ELEMENTS) {
      throw invalidIcon(`Expected an icon of at most ${ICON_MAX_ELEMENTS} elements`);
    }
    const svg = sanitizeSvg(fetched.text);
    if (svg === null) {
      throw invalidIcon('Expected an SVG image');
    }
    if (Buffer.byteLength(svg) > ICON_MAX_BYTES) {
      throw invalidIcon(`Expected an icon of at most ${ICON_MAX_BYTES / 1024} KB`);
    }
    return svg;
  };
}
