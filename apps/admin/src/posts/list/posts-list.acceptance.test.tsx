import { beforeEach, describe, expect, it } from 'vitest';

import {
  configResponse,
  fakePages,
  fakePosts,
  fakePostsListScreen,
  renderAdminApp,
  settingsResponse,
  type RenderAdminAppOptions,
  type ResourceCapture,
} from '@test-utils/acceptance';
import { postsListScreen } from './posts-list.screen';
import { sidebarScreen } from '@/layout/sidebar.screen';

const FLAG_ON = { labs: { postsListReact: true } };
const FLAG_OFF = { labs: { postsListReact: false } };

/** A backend that predates the flag: the key is missing from both labs sources. */
function flagAbsent(): RenderAdminAppOptions {
  const config = configResponse();
  delete config.config.labs?.postsListReact;
  const settings = settingsResponse();
  const labsSetting = settings.settings.find(({ key }) => key === 'labs')!;
  const labs = JSON.parse(labsSetting.value as string) as Record<string, boolean>;
  delete labs.postsListReact;
  labsSetting.value = JSON.stringify(labs);
  return { boot: { browseConfig: { response: config }, browseSettings: { response: settings } } };
}

/**
 * The shell moves its Ember host out of `body` and reveals it for an
 * Ember-served route — and for every route until the current user loads, so
 * read it only once the sidebar has mounted.
 */
function emberHostShown(): boolean {
  const emberRoot = document.getElementById('ember-app')?.parentElement;
  return Boolean(emberRoot && emberRoot !== document.body && !emberRoot.hidden);
}

/**
 * Proves the `postsListReact` flag swap end-to-end in the real admin app: the
 * React screen appears only when the flag is on, and the Ember side of the URL
 * is delegated to otherwise.
 *
 * There is no Ember app in this harness, so "Ember serves it" shows up as the
 * React screen being absent rather than as an Ember list being present — the
 * Ember half of the handshake (PostsRoute aborting its transition) is covered
 * in apps/ember-admin/tests/acceptance/posts-list-react-flag-test.js.
 */
describe('Posts and pages list flag', () => {
  let pagesApi: ResourceCapture;
  let postsApi: ResourceCapture;

  // The screen queries once per status bucket as soon as it mounts; the
  // content is irrelevant here, this file is only about which implementation
  // serves the route.
  beforeEach(() => {
    fakePostsListScreen();
    postsApi = fakePosts([]);
    pagesApi = fakePages([]);
  });

  describe.each([
    { resource: 'posts', route: '/posts', title: 'Posts', newLabel: 'New post' },
    { resource: 'pages', route: '/pages', title: 'Pages', newLabel: 'New page' },
  ] as const)('$route', ({ resource, route, title, newLabel }) => {
    it('renders the React screen when the flag is on', async () => {
      await renderAdminApp(route, FLAG_ON);

      await expect.element(postsListScreen.page(resource)).toBeVisible();
      await expect.element(postsListScreen.title(resource, title)).toBeVisible();
    });

    it('offers the primary create action', async () => {
      await renderAdminApp(route, FLAG_ON);

      await expect.element(postsListScreen.newLink(resource, newLabel)).toBeVisible();
    });

    // That the *Ember* list isn't mounted alongside this one is asserted in
    // apps/ember-admin/tests/acceptance/posts-list-react-flag-test.js —
    // there is no Ember app in this harness, so it can't be checked here.

    it('defers to Ember when the flag is off', async () => {
      await renderAdminApp(route, FLAG_OFF);

      await expect.element(sidebarScreen.shellNav()).toBeVisible();
      await expect.poll(emberHostShown).toBe(true);
      await expect(postsListScreen.page(resource)).toHaveCount(0);
    });

    it('defers to Ember when the flag is absent entirely', async () => {
      await renderAdminApp(route, flagAbsent());

      await expect.element(sidebarScreen.shellNav()).toBeVisible();
      await expect.poll(emberHostShown).toBe(true);
      await expect(postsListScreen.page(resource)).toHaveCount(0);
    });
  });

  // The two routes share one gate implementation, so a copy-paste slip would
  // silently serve the wrong screen.
  it('serves each route its own resource', async () => {
    await renderAdminApp('/pages', FLAG_ON);

    await expect.element(postsListScreen.page('pages')).toBeVisible();
    await expect(postsListScreen.page('posts')).toHaveCount(0);
    await expect.poll(() => pagesApi.requests.length).toBeGreaterThan(0);
    expect(postsApi.requests).toHaveLength(0);
  });
});
