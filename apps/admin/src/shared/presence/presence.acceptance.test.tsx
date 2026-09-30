import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  configResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakePosts,
  fakePostsListScreen,
  post,
  renderAdminApp,
} from '@test-utils/acceptance';

const id = 'a'.repeat(24);
const event = {
  eventId: 'event',
  userId: 'b'.repeat(24),
  name: 'Alex Smith',
  avatar: null,
  resourceId: id,
  resourceType: 'post',
};
function boot(supported = true) {
  const response = configResponse({
    labs: { editorPresence: true, editorReact: true, postsListReact: true },
  });
  return {
    labs: response.config.labs,
    boot: {
      browseConfig: {
        response: {
          config: { ...response.config, ...(supported ? { editorPresence: true } : {}) },
        },
      },
    },
  };
}
function fakePresence() {
  return fakeAdminEndpoint('POST', '/presence/', () => ({
    presence: [{ events: [{ ...event, ts: Date.now() }], serverTime: Date.now() }],
  }));
}

describe('Presence in React Admin', () => {
  it('shows other editors in the editor header', async () => {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', new RegExp(`/posts/${id}/\\?`), { posts: [post({ id })] });
    const presence = fakePresence();
    await renderAdminApp(`/editor/post/${id}`, boot());
    await expect
      .element(page.getByRole('img', { name: 'Alex Smith is active in the editor' }))
      .toBeVisible();
    expect(presence.requests[0].body).toMatchObject({
      presence: [{ editing: { id, type: 'post' } }],
    });
  });

  it('batches presence for visible post rows without advertising the viewer', async () => {
    fakePostsListScreen();
    fakePosts([post({ id, title: 'Presence example' })]);
    const presence = fakePresence();
    await renderAdminApp('/posts?type=draft', boot());
    await expect.element(page.getByTestId('presence-avatars')).toBeVisible();
    expect(presence.requests[0].body).toMatchObject({
      presence: [{ resources: [{ id, type: 'post' }] }],
    });
    expect(presence.requests[0].body).not.toHaveProperty('presence.0.editing');
  });

  it('keeps the editor usable against an older backend even with the flag enabled', async () => {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', new RegExp(`/posts/${id}/\\?`), {
      posts: [post({ id, title: 'Older backend' })],
    });
    const presence = fakePresence();
    await renderAdminApp(`/editor/post/${id}`, boot(false));
    await expect
      .element(page.getByRole('textbox', { name: 'Post title', exact: true }))
      .toHaveValue('Older backend');
    await expect.element(page.getByTestId('presence-avatars')).not.toBeInTheDocument();
    expect(presence.requests).toHaveLength(0);
  });
});
