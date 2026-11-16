import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';

/**
 * Whether Ghost checked who made the app. Nothing does yet: the manifest names the developer and
 * Admin shows it as given. The one place that changes once Ghost verifies developers.
 */
export function isVerifiedDeveloper(_manifest: AppManifest): boolean {
  return false;
}

/**
 * Where a publisher reaches an app's developer for support: the author's link in its manifest, a
 * web page or a `mailto:` link. A page opens in a new tab; an email address opens the publisher's
 * email client.
 */
export function supportLink(manifest: AppManifest): { href: string; opensPage: boolean } {
  const href = manifest.author.url;
  return { href, opensPage: !/^mailto:/i.test(href) };
}
