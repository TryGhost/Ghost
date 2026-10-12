export function appDetailsRoute(installationId: string): string {
  return `/apps/details/${installationId}`;
}

/**
 * The install screen doubles as the review: it compares the current manifest with the
 * approved one.
 */
export function appReviewRoute(manifestUrl: string): string {
  return `/apps/install?manifest=${encodeURIComponent(manifestUrl)}`;
}
