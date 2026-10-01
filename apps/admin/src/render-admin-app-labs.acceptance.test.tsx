import { describe, expect, it } from 'vitest';

import {
  configResponse,
  fakePages,
  fakePosts,
  fakePostsListScreen,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';
import { postsListScreen } from '@/posts/list/posts-list.screen';

describe('renderAdminApp labs + boot', () => {
  // postsListReact gates which implementation serves /posts, so the React
  // screen appearing proves the flag survived the boot overrides.
  it('applies labs flags alongside browseConfig and browseSettings overrides', async () => {
    fakePostsListScreen();
    fakePosts([]);
    fakePages([]);
    await renderAdminApp('/posts', {
      labs: { postsListReact: true },
      boot: {
        browseConfig: { response: configResponse() },
        browseSettings: { response: settingsResponse() },
      },
    });

    await expect.element(postsListScreen.page('posts')).toBeVisible();
  });
});
