import { renderAdminApp, type RenderAdminAppOptions } from './render-admin-app';
import { fakePostsListScreen, fakeSettingsScreens } from './resources';
import { withScreenDefaults } from './worker';

/** Incidental settings reads only. Declare saves separately with fakeEditSettings(). */
export async function renderSettingsScreen(
  route = '/settings',
  options: RenderAdminAppOptions = {},
) {
  withScreenDefaults(fakeSettingsScreens);
  return await renderAdminApp(route, options);
}

/** Explicit flags (including false) and resource fakes override these screen defaults. */
export async function renderPostsListScreen(route = '/posts', options: RenderAdminAppOptions = {}) {
  withScreenDefaults(fakePostsListScreen);
  return await renderAdminApp(route, {
    ...options,
    labs: { postsListReact: true, ...options.labs },
  });
}
