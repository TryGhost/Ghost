export function appDetailsRoute(installationId: string): string {
  return `/apps/details/${installationId}`;
}

/**
 * Changes are reviewed on the install screen: given the app's manifest URL, it fetches the
 * current manifest and shows what changed since the last approval.
 */
export function appReviewRoute(manifestUrl: string): string {
  return `/apps/install?manifest=${encodeURIComponent(manifestUrl)}`;
}
