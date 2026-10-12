import { isLocalhost } from './localhost.ts';
import type { AppManifest } from './schema.ts';

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

/** The page's host, which can differ from the host the manifest was read from. */
export function servedFrom(manifest: AppManifest): string {
  return pageUrl(manifest).host;
}

/** Ghost only allows these in development. */
export function isDevelopmentApp(manifest: AppManifest): boolean {
  return isLocalhost(pageUrl(manifest).hostname);
}

export interface ServedManifest {
  manifestUrl: string;
  manifest: AppManifest;
}

export interface AppMove {
  from: string;
  to: string;
}

/**
 * A new host for the page counts first, then one for the manifest. A different path on the
 * same host isn't a move, since the same party serves both.
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
