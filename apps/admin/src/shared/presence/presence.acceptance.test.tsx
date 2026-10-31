import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakePosts,
  fakePostsListScreen,
  post,
  renderAdminApp,
} from '@test-utils/acceptance';

const POST_ID = 'a'.repeat(24);
const OTHER_USER = 'b'.repeat(24);
const POLLING_ON = { labs: { editorPresencePolling: true } };

function fakePresence(status = 200) {
  return fakeAdminEndpoint('POST', '/presence/', () =>
    status === 200
      ? {
          presence: [
            {
              active: [
                { userId: OTHER_USER, resourceId: POST_ID, resourceType: 'post', ts: Date.now() },
              ],
              serverTime: Date.now(),
            },
          ],
        }
      : new Response(
          JSON.stringify({ errors: [{ type: 'NotFoundError', message: 'Resource not found' }] }),
          { status, headers: { 'Content-Type': 'application/json' } },
        ),
  );
}

/** Leaving the editor sends a leave with keepalive; the harness must answer it. */
function fakeLeave() {
  return fakeAdminEndpoint('POST', '/presence/leave/', () => new Response(null, { status: 204 }));
}

function fakePostRead(title: string) {
  fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
    posts: [post({ id: POST_ID, title })],
  });
}

describe('presence polling', () => {
  it('records the open post from the editor', async () => {
    fakeEditorChrome();
    fakePostRead('Presence example');
    fakeLeave();
    const presence = fakePresence();
    await renderAdminApp(`/editor/post/${POST_ID}`, POLLING_ON);
    await expect.poll(() => presence.requests.length).toBeGreaterThan(0);
    expect(presence.requests[0].body).toMatchObject({
      presence: [
        { editing: { id: POST_ID, type: 'post' }, resources: [{ id: POST_ID, type: 'post' }] },
      ],
    });
  });

  it('asks about the visible rows from the posts list without advertising the viewer', async () => {
    fakePostsListScreen();
    fakePosts([post({ id: POST_ID, title: 'Presence example', status: 'draft' })]);
    const presence = fakePresence();
    await renderAdminApp('/posts?type=draft', POLLING_ON);
    await expect.poll(() => presence.requests.length).toBeGreaterThan(0);
    expect(presence.requests[0].body).toMatchObject({
      presence: [{ resources: [{ id: POST_ID, type: 'post' }] }],
    });
    expect(presence.requests[0].body).not.toHaveProperty('presence.0.editing');
  });

  it('sends nothing while the flag is off', async () => {
    fakePostsListScreen();
    fakePosts([post({ id: POST_ID, title: 'Presence example', status: 'draft' })]);
    const presence = fakePresence();
    await renderAdminApp('/posts?type=draft');
    await expect.element(page.getByText('Presence example')).toBeVisible();
    expect(presence.requests).toHaveLength(0);
  });

  it('stops after one request against an older backend and leaves the editor usable', async () => {
    fakeEditorChrome();
    fakePostRead('Older backend');
    const presence = fakePresence(404);
    await renderAdminApp(`/editor/post/${POST_ID}`, POLLING_ON);
    await expect
      .element(page.getByRole('textbox', { name: 'Post title', exact: true }))
      .toHaveValue('Older backend');
    await expect.poll(() => presence.requests.length).toBe(1);
  });

  it('polls the rows of a list reached by leaving the editor', async () => {
    fakeEditorChrome();
    fakePostRead('Presence example');
    fakeLeave();
    fakePostsListScreen();
    fakePosts([post({ id: POST_ID, title: 'Presence example', status: 'draft' })]);
    const presence = fakePresence();
    await renderAdminApp(`/editor/post/${POST_ID}`, POLLING_ON);
    await expect.poll(() => presence.requests.length).toBeGreaterThan(0);
    await page.getByRole('link', { name: 'Posts', exact: true }).click();
    await expect.element(page.getByText('Presence example')).toBeVisible();
    await expect
      .poll(() =>
        presence.requests.some(
          ({ body }) =>
            !('editing' in (body as { presence: Array<Record<string, unknown>> }).presence[0]) &&
            JSON.stringify(body).includes(POST_ID),
        ),
      )
      .toBe(true);
  });
});
