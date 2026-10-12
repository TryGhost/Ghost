import { isLocalhost } from './localhost.ts';
import type { AppManifest } from './schema.ts';

function pageUrl(manifest: AppManifest): URL {
  const page =
    manifest.surfaces.find((surface) => surface.type === 'admin_page') ?? manifest.surfaces[0];
  if (!page) {
    // Parsing rejects a manifest without surfaces, so this only throws on a bug. It's a
    // plain Error because this package's root entry point has no dependencies.
    // eslint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error('The manifest has no surfaces');
  }
  return new URL(page.url);
}

/**
 * The host the app's page loads from, such as `podcast.example.com`. That's where the app
 * runs, which can differ from where its manifest is hosted.
 */
export function servedFrom(manifest: AppManifest): string {
  return pageUrl(manifest).host;
}

/** Whether the app's page loads from localhost. Ghost only allows such apps in development. */
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
 * Whether the app moved to another host between two versions, and from where to where. A
 * new page host counts first; otherwise a new manifest host does. A new path on the same
 * host isn't a move, because the same party still serves the app.
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
