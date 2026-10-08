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
