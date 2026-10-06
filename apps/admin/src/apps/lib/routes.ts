/** Admin's route for an app page; the app's own `/` is the app's home. */
export function appRoute(installationId: string, path = '/'): string {
  return path === '/' ? `/apps/${installationId}` : `/apps/${installationId}${path}`;
}
