import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakePosts,
  fakeSnippets,
  post,
  renderAdminApp,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

/**
 * The editor is a focused writing surface — Ghost hides the nav sidebar for it,
 * and always has.
 *
 * Ember arranges that by setting `ui.isFullScreen` when the editor route
 * *activates*. With `postsListReact` on, the posts route aborts its transition,
 * so the editor route never deactivates — and a second visit is a model change
 * on an already-active route, where `activate()` does not run again. The
 * sidebar came back from the second post onwards.
 *
 * React decides it from the route whenever it owns either side of the
 * navigation, which does not care how many times you have been there. When
 * both screens are Ember-owned, the route yields to Ember's ui service so it
 * can reveal the sidebar before React's URL match catches up with the
 * transition.
 *
 * These tests pin the route's own decision. They cannot prove the *original*
 * bug is gone: there is no Ember in this harness, so `useSidebarVisibility`
 * returns its default and the Ember half of the handshake is never exercised.
 * What they guarantee is that React can keep the sidebar hidden on the editor
 * route when it owns part of the navigation. The real cross-router transitions
 * still need verification against a running Ghost.
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
    fakeAdminEndpoint('GET', /^\/posts\/abc123\/\?/, { posts: [post({ id: 'abc123' })] });
    await renderAdminApp('/editor/post/abc123', { labs: { editorReact: true } });

    await expect.element(editorScreen.root()).toBeVisible();
    await expect(sidebar()).toHaveCount(0);
  });

  // ...and still shows it everywhere else, or this would be a worse bug than
  // the one it fixes.
  it('leaves the sidebar alone on the posts list', async () => {
    await renderAdminApp('/posts');

    await expect.element(sidebar()).toBeVisible();
  });
});
