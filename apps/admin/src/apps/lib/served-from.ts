import { type AppMove, movedBetween as movedBetweenVersions } from '@tryghost/app-contracts';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';

export { appPageUrl, isDevelopmentApp, servedFrom } from '@tryghost/app-contracts';

interface ManifestAt {
  manifest_url: string;
  manifest: AppManifest;
}

export function movedBetween(approved: ManifestAt, reviewed: ManifestAt): AppMove | null {
  return movedBetweenVersions(
    { manifestUrl: approved.manifest_url, manifest: approved.manifest },
    { manifestUrl: reviewed.manifest_url, manifest: reviewed.manifest },
  );
}
