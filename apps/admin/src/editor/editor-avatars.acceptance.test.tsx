import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeUsers,
  post,
  renderAdminApp,
  staffUser,
} from '@test-utils/acceptance';
import { editorLeaseAvatar, editorLeaseCard } from '@tryghost/test-data/selectors/editor';
import { editorScreen } from './editor.screen';

const POST_ID = 'a'.repeat(24);
const HOLDER = 'b'.repeat(24);
const VIEWER = 'c'.repeat(24);
const SECOND_VIEWER = 'd'.repeat(24);
const FLAGS = { labs: { editorPresencePolling: true, editorPresence: true, editorLease: true } };

function fakeEditor(viewers: string[], occupied = true) {
  fakeEditorChrome();
  const me = currentUserResponse().users[0];
  fakeUsers([
    staffUser({ id: HOLDER, name: 'Zoe Writer', profile_image: null }),
    staffUser({ id: VIEWER, name: 'Alice Reader', profile_image: null }),
    staffUser({ id: SECOND_VIEWER, name: 'Beth Reader', profile_image: null }),
  ]);
  fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
    posts: [
      post({
        id: POST_ID,
        title: 'Avatar example',
        status: 'published',
        published_at: '2026-01-01T00:00:00.000Z',
      }),
    ],
  });
  fakeAdminEndpoint('POST', '/presence/leave/', () => new Response(null, { status: 204 }));
  let mine = false;
  fakeAdminEndpoint('POST', '/presence/', ({ body }) => {
    const asked = (body as { presence: [{ lease?: string }] }).presence[0].lease;
    if (asked === 'hold' && !occupied) {
      mine = true;
    }
    return {
      presence: [
        {
          active: [...(occupied ? [HOLDER] : []), ...viewers].map((userId) => ({
            userId,
            resourceId: POST_ID,
            resourceType: 'post',
            ts: Date.now(),
          })),
          lease: occupied
            ? { userId: HOLDER, mine: false }
            : mine
              ? { userId: me.id, mine: true }
              : null,
          serverTime: Date.now(),
        },
      ],
    };
  });
}

const viewers = () => page.getByTestId('presence-avatars');
const viewer = (name: string) => viewers().getByRole('img', { name: `${name} has this post open` });
const you = () => viewers().getByRole('img', { name: 'You have this post open' });
/** The avatars as the header row reads them, left to right. */
const inOrder = (...avatars: Element[]) =>
  avatars.every(
    (avatar, index) =>
      index === 0 ||
      Boolean(
        avatars[index - 1].compareDocumentPosition(avatar) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
  );

describe('Editor avatars', () => {
  it('opens viewer tooltips without a hover delay', async () => {
    fakeEditor([VIEWER], false);
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAGS);
    await expect.element(viewer('Alice Reader')).toBeVisible();
    await userEvent.hover(viewers());
    await expect
      .element(page.getByRole('tooltip'), { timeout: 500 })
      .toHaveTextContent('Alice Reader');
  });

  it('keeps the UI visible while others are present and resumes auto-hide once alone', async () => {
    const present: string[] = [];
    fakeEditor(present, false);
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAGS);
    await expect
      .poll(() => (editorScreen.titleInput().element() as HTMLTextAreaElement).readOnly)
      .toBe(false);
    const focusState = () =>
      editorScreen
        .settingsToggle()
        .element()
        .closest('[data-writing-focus]')
        ?.getAttribute('data-writing-focus');

    await editorScreen.titleInput().fill('Writing alone');
    await expect.poll(focusState).toBe('hidden');

    present.push(VIEWER);
    document.dispatchEvent(new Event('visibilitychange'));
    await expect.poll(focusState).toBe('shown');
    await editorScreen.titleInput().fill('Writing with company');
    await expect.poll(focusState).toBe('shown');

    present.pop();
    document.dispatchEvent(new Event('visibilitychange'));
    await expect.element(viewers()).not.toBeInTheDocument();
    await editorScreen.titleInput().fill('Alone again');
    await expect.poll(focusState).toBe('hidden');
  });

  it('includes the current viewer as soon as another person is present and hides them when alone', async () => {
    const present: string[] = [];
    fakeEditor(present, false);
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAGS);
    await expect
      .poll(() => (editorScreen.titleInput().element() as HTMLTextAreaElement).readOnly)
      .toBe(false);
    await expect.element(viewers()).not.toBeInTheDocument();

    present.push(VIEWER);
    document.dispatchEvent(new Event('visibilitychange'));
    await expect.element(you()).toBeVisible();
    await expect.element(viewer('Alice Reader')).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'You are editing this post', exact: true }))
      .not.toBeInTheDocument();

    present.pop();
    document.dispatchEvent(new Event('visibilitychange'));
    await expect.element(viewers()).not.toBeInTheDocument();
  });

  it('leads with the editing avatar, followed by you as a viewer', async () => {
    fakeEditor([]);
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAGS);

    const editing = page.getByTestId(editorLeaseAvatar);
    await expect.element(editing).toHaveAccessibleName('Zoe Writer is editing this post');
    await expect.element(you()).toBeVisible();
    expect(inOrder(editing.element(), you().element())).toBe(true);

    await editing.click();
    await expect
      .element(page.getByTestId(editorLeaseCard))
      .toHaveTextContent('Zoe Writer is editing this post.');
    await expect
      .element(page.getByTestId(editorLeaseCard).getByRole('button', { name: 'Take over' }))
      .toBeVisible();
  });

  it('leads with the editor, then you, then the other viewers', async () => {
    fakeEditor([VIEWER, SECOND_VIEWER]);
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAGS);

    const editing = page.getByTestId(editorLeaseAvatar);
    await expect.element(viewer('Beth Reader')).toBeVisible();
    expect(
      inOrder(
        editing.element(),
        you().element(),
        viewer('Alice Reader').element(),
        viewer('Beth Reader').element(),
      ),
    ).toBe(true);
  });

  it('leads with this tab’s editing avatar after its first edit', async () => {
    fakeEditor([VIEWER, SECOND_VIEWER], false);
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAGS);
    await expect.element(editorScreen.titleInput()).toHaveValue('Avatar example');
    await expect
      .poll(() => (editorScreen.titleInput().element() as HTMLTextAreaElement).readOnly)
      .toBe(false);
    await editorScreen.titleInput().fill('My edit');

    const editing = page.getByRole('button', { name: 'You are editing this post', exact: true });
    await expect.element(editing).toBeVisible();
    await expect.element(page.getByTestId(editorLeaseAvatar)).not.toBeInTheDocument();
    await expect.element(you()).not.toBeInTheDocument();
    expect(inOrder(editing.element(), viewer('Alice Reader').element())).toBe(true);
    await userEvent.keyboard('{Escape}');
    await userEvent.hover(editing);
    await expect
      .element(page.getByRole('tooltip'), { timeout: 500 })
      .toHaveTextContent('You are editing this post.');
    await expect.element(page.getByTestId(editorLeaseCard)).not.toBeInTheDocument();
  });
});
