import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';

export function appDetailsRoute(installationId: string): string {
  return `/apps/details/${installationId}`;
}

/**
 * Changes are reviewed on the install screen.
 * It fetches the app's latest manifest and shows what changed.
 */
export function appReviewRoute(manifestUrl: string): string {
  return `/apps/install?manifest=${encodeURIComponent(manifestUrl)}`;
}

/**
 * Where opening an installed app goes. A suspended app opens the review of its
 * changes instead. Apps don't run in Admin yet (BER-3982), so an active app
 * opens its details page for now.
 */
export function appOpenRoute(
  installation: Pick<AppInstallation, 'id' | 'status' | 'manifest_url'>,
): string {
  return installation.status === 'suspended'
    ? appReviewRoute(installation.manifest_url)
    : appDetailsRoute(installation.id);
}
