/**
 * Loads the admin afresh at a route. Every session change goes through here:
 * the hidden Ember app has to boot with the new session for the screens it
 * still serves. replaceState is not a navigation, so the reload is the only
 * one and neither router sees an intermediate route.
 */
export function reloadAdmin(route: string): void {
  window.history.replaceState(null, '', `#${route}`);
  window.location.reload();
}
