import { isLocalhost } from './localhost.ts';
import type { AppManifest } from './schema.ts';

function pageUrl(manifest: AppManifest): URL {
  const page =
    manifest.surfaces.find((surface) => surface.type === 'admin_page') ?? manifest.surfaces[0];
  if (!page) {
    // Parsing rejects manifests without surfaces, so this only happens on a bug.
    // It's a plain Error because this entry point can't have dependencies.
    // oxlint-disable-next-line ghost/ghost-custom/no-native-error
    throw new Error('The manifest has no surfaces');
  }
  return new URL(page.url);
}

export function appPageUrl(manifest: AppManifest): string {
  return pageUrl(manifest).href;
}

/**
 * The host the app's page loads from, like `podcast.example.com`.
 * This is where the app runs. It can differ from where the manifest is hosted.
 */
export function servedFrom(manifest: AppManifest): string {
  return pageUrl(manifest).host;
}

/** True when the app's page is on localhost. Ghost only allows that in development. */
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
 * Returns the old and new host if the app moved, or null if it didn't.
 * A new page host counts first, then a new manifest host.
 * A new path on the same host isn't a move.
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
