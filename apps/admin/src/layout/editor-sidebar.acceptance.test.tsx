import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakeEmailPreview,
  fakeNewsletters,
  fakePosts,
  fakePostsListScreen,
  fakeSnippets,
  post,
  renderAdminApp,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

/**
 * The editor is a focused writing surface — Ghost hides the nav sidebar for it.
 * The route decides it, so repeat visits (list -> editor -> list -> editor)
 * keep it hidden.
 */
describe('Editor chrome', () => {
  const sidebar = () => page.getByTestId('admin-sidebar');

  it('hides the nav sidebar', async () => {
    await renderAdminApp('/editor/post/abc123');

    await expect(sidebar()).toHaveCount(0);
  });

  it('hides it for a page too', async () => {
    await renderAdminApp('/editor/page/abc123');

    await expect(sidebar()).toHaveCount(0);
  });

  // The decision lives on the route handle, so it must hold on both sides of
  // the `editorReact` gate — here the React editor serves the route.
  it('hides it with editorReact on', async () => {
    fakeSnippets([]);
    fakePosts([]);
    // The header's publish inputs read the newsletter list.
    fakeNewsletters([]);
    fakeEmailPreview();
    fakeAdminEndpoint('GET', /^\/posts\/abc123\/\?/, { posts: [post({ id: 'abc123' })] });
    await renderAdminApp('/editor/post/abc123', { labs: { editorReact: true } });

    await expect.element(editorScreen.root()).toBeVisible();
    await expect(sidebar()).toHaveCount(0);
  });

  // ...and still shows it everywhere else, or this would be a worse bug than
  // the one it fixes.
  it('leaves the sidebar alone on the posts list', async () => {
    fakePostsListScreen();
    fakePosts([]);
    await renderAdminApp('/posts');

    await expect.element(sidebar()).toBeVisible();
  });
});
