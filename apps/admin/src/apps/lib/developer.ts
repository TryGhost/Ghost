import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';

/**
 * Whether Ghost checked who made the app. Nothing does yet: the manifest names the developer and
 * Admin shows it as given. The one place that changes once Ghost verifies developers.
 */
export function isVerifiedDeveloper(_manifest: AppManifest): boolean {
  return false;
}
