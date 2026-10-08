import { type AppMove, movedBetween as movedBetweenVersions } from '@tryghost/app-contracts';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';

// Where an app is served from is a rule shared with Ghost, which names it in an app's history.
export { isDevelopmentApp, servedFrom } from '@tryghost/app-contracts';

/** A manifest and where it was read from, as the Admin API returns them. */
interface ManifestAt {
  manifest_url: string;
  manifest: AppManifest;
}

/**
 * Whether an installed app would move to another host. Returns the hosts to name, or
 * null when it stays.
 */
export function movedBetween(approved: ManifestAt, reviewed: ManifestAt): AppMove | null {
  return movedBetweenVersions(
    { manifestUrl: approved.manifest_url, manifest: approved.manifest },
    { manifestUrl: reviewed.manifest_url, manifest: reviewed.manifest },
  );
}
