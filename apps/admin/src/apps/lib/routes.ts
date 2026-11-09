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
  installation: Pick<AppInstallation, 'id' | 'status' | 'manifest_url'> & {
    manifest?: Pick<AppInstallation['manifest'], 'surfaces'>;
  },
): string {
  if (installation.status === 'suspended') {
    return appReviewRoute(installation.manifest_url);
  }
  // An app with no page, such as one that only adds cards, opens on its details.
  return installation.manifest?.surfaces && !hasAppPage(installation.manifest)
    ? appDetailsRoute(installation.id)
    : appRoute(installation.id);
}

/** Whether an app has a page in Admin to open. */
export function hasAppPage(manifest: Pick<AppInstallation['manifest'], 'surfaces'>): boolean {
  return manifest.surfaces.some((surface) => surface.type === 'admin_page');
}
