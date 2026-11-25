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
    const me = currentUserResponse().users[0];
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAGS);
    await expect
      .poll(() => (editorScreen.titleInput().element() as HTMLTextAreaElement).readOnly)
      .toBe(false);
    await expect.element(viewers()).not.toBeInTheDocument();

    present.push(VIEWER);
    document.dispatchEvent(new Event('visibilitychange'));
    await expect.element(viewer(String(me.name))).toBeVisible();
    await expect.element(viewer('Alice Reader')).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'You are editing this post', exact: true }))
      .not.toBeInTheDocument();

    present.pop();
    document.dispatchEvent(new Event('visibilitychange'));
    await expect.element(viewers()).not.toBeInTheDocument();
  });

  it('shows the editing avatar first without a lock icon and stacks two people', async () => {
    fakeEditor([]);
    const me = currentUserResponse().users[0];
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAGS);

    const editing = page.getByTestId(editorLeaseAvatar);
    await expect.element(editing).toHaveAccessibleName('Zoe Writer is editing this post');
    await expect.element(viewer(String(me.name))).toBeVisible();
    expect(editing.element().querySelector('svg')).toBeNull();
    const editorBounds = editing.element().getBoundingClientRect();
    expect(viewer(String(me.name)).element().getBoundingClientRect().left).toBeLessThan(
      editorBounds.right,
    );
    expect(getComputedStyle(viewers().element().parentElement!).paddingRight).toBe('8px');

    await editing.click();
    await expect
      .element(page.getByTestId(editorLeaseCard))
      .toHaveTextContent('Zoe Writer is editing this post.');
    await expect
      .element(page.getByTestId(editorLeaseCard).getByRole('button', { name: 'Take over' }))
      .toBeVisible();
  });

  it('stacks everyone with the editor in front and dims each viewer over its own white backing', async () => {
    fakeEditor([VIEWER, SECOND_VIEWER]);
    const me = currentUserResponse().users[0];
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAGS);

    const editing = page.getByTestId(editorLeaseAvatar);
    await expect.element(viewer('Beth Reader')).toBeVisible();
    const first = viewer('Alice Reader').element();
    const second = viewer('Beth Reader').element();
    const current = viewer(String(me.name)).element();
    const editorBounds = editing.element().getBoundingClientRect();
    expect(current.getBoundingClientRect().left).toBeLessThan(editorBounds.right);
    expect(first.getBoundingClientRect().left).toBeLessThan(current.getBoundingClientRect().right);
    expect(second.getBoundingClientRect().left).toBeLessThan(first.getBoundingClientRect().right);
    expect(Number(getComputedStyle(editing.element()).zIndex)).toBeGreaterThan(0);
    for (const avatar of [current, first, second]) {
      expect(getComputedStyle(avatar).backgroundColor).toBe('oklch(1 0 0)');
      expect(getComputedStyle(avatar.firstElementChild!).opacity).toBe('0.5');
    }
    expect(getComputedStyle(editing.element().firstElementChild!).opacity).toBe('1');
  });

  it('shows this tab’s editing avatar first after its first edit and dims the other people', async () => {
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
    await expect
      .element(viewer(String(currentUserResponse().users[0].name)))
      .not.toBeInTheDocument();
    const first = viewer('Alice Reader').element();
    expect(editing.element().getBoundingClientRect().left).toBeLessThan(
      first.getBoundingClientRect().left,
    );
    expect(getComputedStyle(first.firstElementChild!).opacity).toBe('0.5');
    await userEvent.keyboard('{Escape}');
    await userEvent.hover(editing);
    await expect
      .element(page.getByRole('tooltip'), { timeout: 500 })
      .toHaveTextContent('You are editing this post.');
    await expect.element(page.getByTestId(editorLeaseCard)).not.toBeInTheDocument();
  });
});
