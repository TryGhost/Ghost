/**
 * The app's page, for a suspended app too: opening it re-checks the app's manifest, then shows
 * the app or the review of its changes, whichever the re-check finds.
 */
export function appRoute(installationId: string): string {
  return `/apps/${installationId}`;
}

export function appDetailsRoute(installationId: string): string {
  return `/apps/details/${installationId}`;
}
