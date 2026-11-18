import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  fakeAdminEndpoint,
  fakeAdminStats,
  fakeEditorChrome,
  fakePosts,
  fakePostsListScreen,
  fakeUsers,
  post,
  renderAdminApp,
  staffUser,
} from '@test-utils/acceptance';

const POST_ID = 'a'.repeat(24);
const OTHER_USER = 'b'.repeat(24);
const POLLING_ON = { labs: { editorPresencePolling: true } };
const INDICATORS_ON = { labs: { editorPresencePolling: true, editorPresence: true } };

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

/** Long enough for a list's debounced first poll to leave, or for a captured response to render. */
const settle = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 500);
  });

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
    const [{ tab }] = (presence.requests[0].body as { presence: [{ tab: string }] }).presence;
    expect(tab).toMatch(/^[a-f0-9]{24}$/);
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

  it('sends nothing from a list while the flag is off', async () => {
    fakePostsListScreen();
    fakePosts([post({ id: POST_ID, title: 'Presence example', status: 'draft' })]);
    const presence = fakePresence();
    await renderAdminApp('/posts?type=draft');
    await expect.element(page.getByText('Presence example')).toBeVisible();
    await settle();
    expect(presence.requests).toHaveLength(0);
  });

  it('sends nothing from the editor while the flag is off', async () => {
    fakeEditorChrome();
    fakePostRead('Presence example');
    const presence = fakePresence();
    await renderAdminApp(`/editor/post/${POST_ID}`);
    await expect
      .element(page.getByRole('textbox', { name: 'Post title', exact: true }))
      .toHaveValue('Presence example');
    await settle();
    expect(presence.requests).toHaveLength(0);
  });

  it('shows who else is in the editor once both flags are on', async () => {
    fakeEditorChrome();
    fakePostRead('Presence example');
    fakeLeave();
    fakeUsers([staffUser({ id: OTHER_USER, name: 'Alex Smith', profile_image: null })]);
    fakePresence();
    await renderAdminApp(`/editor/post/${POST_ID}`, INDICATORS_ON);
    await expect
      .element(page.getByRole('img', { name: 'Alex Smith has this post open' }))
      .toBeVisible();
  });

  it('names someone the first page of staff does not hold', async () => {
    fakeEditorChrome();
    fakePostRead('Presence example');
    fakeLeave();
    const users = fakeUsers((query) =>
      query.filter?.startsWith('id:[')
        ? [staffUser({ id: OTHER_USER, name: 'Alex Smith', profile_image: null })]
        : [staffUser({ id: 'c'.repeat(24), name: 'Someone Else', profile_image: null })],
    );
    fakePresence();
    await renderAdminApp(`/editor/post/${POST_ID}`, INDICATORS_ON);
    await expect
      .element(page.getByRole('img', { name: 'Alex Smith has this post open' }))
      .toBeVisible();
    expect(users.requests.map((request) => request.filter)).toContain(`id:['${OTHER_USER}']`);
  });

  it.each([false, true])(
    'shows interactive list presence indicators with admin7Design %s',
    async (admin7Design) => {
      fakePostsListScreen();
      fakeAdminStats.memberCount();
      fakeAdminStats.mrr();
      fakePosts([post({ id: POST_ID, title: 'Presence example', status: 'draft' })]);
      fakeUsers([staffUser({ id: OTHER_USER, name: 'Alex Smith', profile_image: null })]);
      fakePresence();
      await renderAdminApp('/posts?type=draft', {
        labs: { ...INDICATORS_ON.labs, admin7Design },
      });
      await expect
        .element(page.getByRole('img', { name: 'Alex Smith has this post open' }))
        .toBeVisible();
      const avatars = page.getByTestId('presence-avatars');
      const bounds = avatars.element().getBoundingClientRect();
      expect(
        document
          .elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
          ?.closest('[data-testid="presence-avatars"]'),
      ).toBe(avatars.element());
      await avatars.hover();
      await expect
        .element(page.getByRole('tooltip', { name: 'Alex Smith has this post open' }))
        .toBeVisible();
      avatars.element().focus();
      await expect.element(avatars).toHaveFocus();
    },
  );

  it('keeps the header clear while only polling is on', async () => {
    fakeEditorChrome();
    fakePostRead('Presence example');
    fakeLeave();
    const presence = fakePresence();
    await renderAdminApp(`/editor/post/${POST_ID}`, POLLING_ON);
    await expect.poll(() => presence.requests.length).toBeGreaterThan(0);
    // The request is captured before its response renders.
    await settle();
    await expect.element(page.getByTestId('presence-avatars')).not.toBeInTheDocument();
  });

  it('stops after one request against an older backend and leaves the editor usable', async () => {
    fakeEditorChrome();
    fakePostRead('Older backend');
    // Teardown can unmount before the 404 lands, and a poller that is still active sends a leave.
    fakeLeave();
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
    const leave = fakeLeave();
    fakePostsListScreen();
    fakePosts([post({ id: POST_ID, title: 'Presence example', status: 'draft' })]);
    const presence = fakePresence();
    await renderAdminApp(`/editor/post/${POST_ID}`, POLLING_ON);
    await expect.poll(() => presence.requests.length).toBeGreaterThan(0);
    await page.getByRole('link', { name: 'Posts', exact: true }).click();
    await expect.element(page.getByText('Presence example')).toBeVisible();
    // Leaving the editor removes this tab's entry, named by the same id the heartbeat carried.
    await expect.poll(() => leave.requests.length).toBeGreaterThan(0);
    const heartbeat = presence.requests[0].body as { presence: [{ tab: string }] };
    expect(leave.requests[0].body).toEqual({
      presence: [{ resource: { id: POST_ID, type: 'post' }, tab: heartbeat.presence[0].tab }],
    });
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
