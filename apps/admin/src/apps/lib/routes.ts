import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';

export function appRoute(installationId: string): string {
  return `/apps/${installationId}`;
}

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
 * Where opening an installed app goes: its page, or the review of its changes
 * while it's suspended, as a suspended app doesn't load.
 */
export function appOpenRoute(
  installation: Pick<AppInstallation, 'id' | 'status' | 'manifest_url'>,
): string {
  return installation.status === 'suspended'
    ? appReviewRoute(installation.manifest_url)
    : appRoute(installation.id);
}
