import { isLocalhost } from './localhost.ts';
import type { AppManifest } from './schema.ts';

/** The URL of the page the app shows in Admin, which is where the app runs. */
function pageUrl(manifest: AppManifest): URL {
  const page =
    manifest.surfaces.find((surface) => surface.type === 'admin_page') ?? manifest.surfaces[0];
  if (!page) {
    // A plain Error: a valid manifest always has a surface, and the root entry point
    // can't depend on @tryghost/errors.
    // eslint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error('The manifest has no surfaces');
  }
  return new URL(page.url);
}

/**
 * The host an app's page loads from, such as `podcast.example.com`. Not where its
 * manifest was read from, which may differ.
 */
export function servedFrom(manifest: AppManifest): string {
  return pageUrl(manifest).host;
}

/** An app served from the developer's own machine, which Ghost only allows in development. */
export function isDevelopmentApp(manifest: AppManifest): boolean {
  return isLocalhost(pageUrl(manifest).hostname);
}

/** A manifest and where it was read from. */
export interface ServedManifest {
  manifestUrl: string;
  manifest: AppManifest;
}

/** The hosts an app moved between. */
export interface AppMove {
  from: string;
  to: string;
}

/**
 * The hosts an app moves between from `approved` to `reviewed`, or null when it stays. A
 * move is a new host for its page or, failing that, for its manifest. A different path on
 * the same host isn't a move, since the same party serves both.
 */
export function movedBetween(approved: ServedManifest, reviewed: ServedManifest): AppMove | null {
  const pages = { from: servedFrom(approved.manifest), to: servedFrom(reviewed.manifest) };
  if (pages.from !== pages.to) {
    return pages;
  }
  const manifests = {
    from: new URL(approved.manifestUrl).host,
    to: new URL(reviewed.manifestUrl).host,
  };
  return manifests.from === manifests.to ? null : manifests;
}
