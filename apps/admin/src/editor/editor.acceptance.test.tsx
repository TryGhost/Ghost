import { describe, expect, it } from 'vitest';

import {
  fakeAdminEndpoint,
  fakePosts,
  fakeSnippets,
  post,
  renderAdminApp,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const FLAG_ON = { labs: { editorReact: true } };
const FLAG_OFF = { labs: { editorReact: false } };

/**
 * The editor route mounts only when its feature flag is enabled. Disabled and
 * missing flags leave it unmounted.
 */
describe('Editor flag', () => {
  function fakeEditorWorld() {
    fakeSnippets([]);
    fakePosts([]);
    fakeAdminEndpoint('GET', /^\/posts\/abc123\/\?/, { posts: [post({ id: 'abc123' })] });
    fakeAdminEndpoint('GET', /^\/pages\/abc123\/\?/, { pages: [post({ id: 'abc123' })] });
  }

  it('renders the React editor when the flag is on', async () => {
    fakeEditorWorld();
    await renderAdminApp('/editor/post/abc123', FLAG_ON);

    await expect.element(editorScreen.root()).toBeVisible();
    await expect.element(editorScreen.backLink('post')).toHaveAttribute('href', '#/posts');
  });

  it('serves a new-post URL too', async () => {
    fakeEditorWorld();
    await renderAdminApp('/editor/post', FLAG_ON);

    await expect.element(editorScreen.root()).toBeVisible();
  });

  it('returns page editors to the pages list', async () => {
    fakeEditorWorld();
    await renderAdminApp('/editor/page/abc123', FLAG_ON);

    await expect.element(editorScreen.root()).toBeVisible();
    await expect.element(editorScreen.backLink('page')).toHaveAttribute('href', '#/pages');
  });

  it('does not mount the editor when the flag is off', async () => {
    await renderAdminApp('/editor/post/abc123', FLAG_OFF);

    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('does not mount the editor when the flag is absent', async () => {
    await renderAdminApp('/editor/post/abc123');

    await expect(editorScreen.root()).toHaveCount(0);
  });
});
