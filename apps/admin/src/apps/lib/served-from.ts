import { isLocalhost } from '@tryghost/app-contracts';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';

/** The URL of the page the app shows in Admin, which is where the app runs. */
function pageUrl(manifest: AppManifest): URL {
  const page =
    manifest.surfaces.find((surface) => surface.type === 'admin_page') ?? manifest.surfaces[0];
  return new URL(page.url);
}

/**
 * Where an app is served from, in plain words: the host its page loads from, such as
 * `podcast.example.com`. Not where its manifest was read from, which may differ.
 */
export function servedFrom(manifest: AppManifest): string {
  return pageUrl(manifest).host;
}

/** An app served from the developer's own machine, which Ghost only allows in development. */
export function isDevelopmentApp(manifest: AppManifest): boolean {
  return isLocalhost(pageUrl(manifest).hostname);
}

/** A manifest and where it was read from. */
interface ManifestAt {
  manifest_url: string;
  manifest: AppManifest;
}

/**
 * Whether an installed app would move to another host: where its page runs, or where Ghost
 * reads its manifest from for updates. Returns the hosts to name, or null when it stays.
 * A different path on the same host isn't a move: the same party serves both.
 */
export function movedBetween(
  approved: ManifestAt,
  reviewed: ManifestAt,
): { from: string; to: string } | null {
  const pages = { from: servedFrom(approved.manifest), to: servedFrom(reviewed.manifest) };
  if (pages.from !== pages.to) {
    return pages;
  }
  const manifests = {
    from: new URL(approved.manifest_url).host,
    to: new URL(reviewed.manifest_url).host,
  };
  return manifests.from === manifests.to ? null : manifests;
}
