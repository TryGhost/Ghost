export function appRoute(installationId: string): string {
  return `/apps/${installationId}`;
}

export function appDetailsRoute(installationId: string): string {
  return `/apps/details/${installationId}`;
}
