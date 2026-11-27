/**
 * Whether the app would currently stop you leaving with unsaved changes.
 *
 * Typing into a dirty screen arms its navigation guard through a chain of
 * passive effects — input, dirty state, guard re-render, blocker registration
 * — and none of it has landed by the time a `fill` resolves. A spec that
 * navigates straight afterwards races the guard, and an unguarded navigation
 * simply goes through: no dialog, and the assertion times out on a screen that
 * has already left.
 *
 * Both guards (`useUnsavedChangesGuard` and settings' `DirtyNavigationGuard`)
 * register the `beforeunload` prompt alongside the router blocker, from the
 * same commit, so a cancelable probe event asks the app the question directly
 * rather than guessing how many frames the chain needs:
 *
 * ```ts
 * await nameInput().fill('Renamed');
 * await expect.poll(unsavedChangesGuarded).toBe(true);
 * window.history.back();
 * ```
 *
 * The fake API drops MSW's own `beforeunload` teardown so the probe can't stop
 * it (see startFakeApi).
 */
export function unsavedChangesGuarded(): boolean {
  const probe = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(probe);
  return probe.defaultPrevented;
}
