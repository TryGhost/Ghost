import type { AppManifest } from './schema.ts';

/**
 * The app's page, or for an app without one, its manifest's address: every surface is on the
 * manifest's origin (D94), so its host is where the app runs either way.
 */
function pageUrl(manifest: AppManifest): URL {
  const page = manifest.surfaces.find((surface) => surface.type === 'admin_page');
  return new URL(page?.url ?? manifest.manifest_url);
}

/** The app's Admin page, or null for an app with none, such as one that only adds cards. */
export function appPageUrl(manifest: AppManifest): string | null {
  const page = manifest.surfaces.find((surface) => surface.type === 'admin_page');
  return page ? page.url : null;
}

/**
 * The host the app's page loads from, like `podcast.example.com`.
 * This is where the app runs. It can differ from where the manifest is hosted.
 */
export function servedFrom(manifest: AppManifest): string {
  return pageUrl(manifest).host;
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
export function movedBetween(approved: AppManifest, reviewed: AppManifest): AppMove | null {
  const pages = { from: servedFrom(approved), to: servedFrom(reviewed) };
  if (pages.from !== pages.to) {
    return pages;
  }
  const manifests = {
    from: new URL(approved.manifest_url).host,
    to: new URL(reviewed.manifest_url).host,
  };
  return manifests.from === manifests.to ? null : manifests;
}
