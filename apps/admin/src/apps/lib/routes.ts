/**
 * Admin's routes for an installed app. `/apps/:id/*` is the app's own page, so managing an
 * app lives under `/apps/details/`, like `/apps/install`.
 */
export function appRoute(installationId: string): string {
  return `/apps/${installationId}`;
}

export function appDetailsRoute(installationId: string): string {
  return `/apps/details/${installationId}`;
}

/**
 * Where an Administrator reviews changes to an app: the install screen, which fetches the
 * manifest again and compares it with what was approved.
 */
export function appReviewRoute(manifestUrl: string): string {
  return `/apps/install?manifest=${encodeURIComponent(manifestUrl)}`;
}
