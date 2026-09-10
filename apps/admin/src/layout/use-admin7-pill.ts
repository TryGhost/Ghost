const editorRoutePattern = /^\/editor(?:\/|$)/;

export function isAdmin7PillAllowedRoute(pathname: string): boolean {
  return !editorRoutePattern.test(pathname);
}
