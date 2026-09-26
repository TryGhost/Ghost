/**
 * Whether the signed-in shell is showing Ember for the current route. The
 * boot screen shows the Ember host before the layout mounts, so the host must
 * also sit in the layout's content area.
 */
export function emberScreenShown(): boolean {
  const app = document.getElementById('ember-app');
  const host = app?.parentElement;
  return Boolean(app && host?.closest('main') && !host.hidden && app.checkVisibility());
}
