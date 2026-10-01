import { beforeEach, describe, expect, it } from 'vitest';

import {
  fakePages,
  fakePosts,
  fakePostsListScreen,
  renderAdminApp,
  type ResourceCapture,
} from '@test-utils/acceptance';
import { postsListScreen } from './posts-list.screen';

describe('Posts and pages list routes', () => {
  let pagesApi: ResourceCapture;
  let postsApi: ResourceCapture;

  // The screen queries once per status bucket as soon as it mounts; the
  // content is irrelevant here, this file is only about which screen serves
  // the route.
  beforeEach(() => {
    fakePostsListScreen();
    postsApi = fakePosts([]);
    pagesApi = fakePages([]);
  });

  describe.each([
    { resource: 'posts', route: '/posts', title: 'Posts', newLabel: 'New post' },
    { resource: 'pages', route: '/pages', title: 'Pages', newLabel: 'New page' },
  ] as const)('$route', ({ resource, route, title, newLabel }) => {
    it('renders the list screen', async () => {
      await renderAdminApp(route);

      await expect.element(postsListScreen.page(resource)).toBeVisible();
      await expect.element(postsListScreen.title(resource, title)).toBeVisible();
    });

    it('offers the primary create action', async () => {
      await renderAdminApp(route);

      await expect.element(postsListScreen.newLink(resource, newLabel)).toBeVisible();
    });

    // Core can still report the retired Labs flag, even as false; Admin ignores it.
    it('ignores the retired postsListReact flag', async () => {
      await renderAdminApp(route, { labs: { postsListReact: false } });

      await expect.element(postsListScreen.page(resource)).toBeVisible();
    });
  });

  // The two routes share one screen implementation, so a copy-paste slip would
  // silently serve the wrong resource.
  it('serves each route its own resource', async () => {
    await renderAdminApp('/pages');

    await expect.element(postsListScreen.page('pages')).toBeVisible();
    await expect(postsListScreen.page('posts')).toHaveCount(0);
    await expect.poll(() => pagesApi.requests.length).toBeGreaterThan(0);
    expect(postsApi.requests).toHaveLength(0);
  });
});
