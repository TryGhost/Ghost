/**
 * Loads the admin afresh at a route. Every session change goes through here.
 * replaceState is not a navigation, so the reload is the only one and the
 * router never sees an intermediate route.
 */
export function reloadAdmin(route: string): void {
  window.history.replaceState(null, '', `#${route}`);
  window.location.reload();
}
