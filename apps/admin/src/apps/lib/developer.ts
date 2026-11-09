import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';

/**
 * Whether Ghost checked who made the app. Nothing does yet: the manifest names the developer and
 * Admin shows it as given. The one place that changes once Ghost verifies developers.
 */
export function isVerifiedDeveloper(_manifest: AppManifest): boolean {
  return false;
}

/**
 * Where a publisher goes for help with an app. Manifests only name the developer's site for now.
 * The one place that changes once they include an email address.
 */
export function supportUrl(manifest: AppManifest): string {
  return manifest.author.url;
}
