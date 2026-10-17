import errors from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import type { AppIcon } from '@tryghost/app-contracts/manifest';
import type { AppFetchFailure, FetchFromApp } from './fetch-from-app';

// Room for a detailed vector logo; most icons are well under 2 KB. Every installed app's
// copy goes to Admin with the installations list, so this bounds that per app. Applied to
// the download and to the sanitized copy, since sanitizing can make an SVG larger.
const ICON_MAX_BYTES = 16 * 1024;

/** Returns the SVG with nothing that can run or load anything, or null if it isn't one. */
export type SanitizeSvg = (svg: string) => string | null;

/**
 * Returns the copy of an app's icon that Ghost stores with a manifest: the sanitized SVG
 * for an icon the app serves, or null for an icon Admin ships.
 */
export type FetchIcon = (icon: AppIcon) => Promise<string | null>;

/** Refused as a problem with the manifest's `icon.url`, which Admin lists by path. */
function invalidIcon(message: string) {
  return new errors.ValidationError({
    message: 'The app manifest is not valid.',
    code: 'APP_MANIFEST_INVALID',
    context: `icon.url: ${message}`,
    errorDetails: [{ path: 'icon.url', message }],
  });
}

function iconError(iconUrl: string, failure: AppFetchFailure, logging: Pick<GhostLogger, 'warn'>) {
  switch (failure.reason) {
    case 'unreachable':
      // Logged like an unreachable manifest, and only the status is said.
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
 * Fetches an app's SVG icon server-side and keeps a sanitized copy, which is all Admin
 * ever draws, so Admin never contacts the app for its icon. The icon is fetched with the
 * same rules as the manifest; `createAppFetcher` describes them.
 *
 * Every problem is thrown as `APP_MANIFEST_INVALID` at `icon.url`, as if the manifest
 * itself were invalid, since the app can't be installed with it.
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
