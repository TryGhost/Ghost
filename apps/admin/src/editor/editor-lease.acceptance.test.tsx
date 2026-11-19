import { afterEach, describe, expect, it } from 'vitest';
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
import {
  editorLeaseAvatar,
  editorLeaseCard,
  editorLeaseOutdated,
  editorLeaseReloadConfirm,
} from '@tryghost/test-data/selectors/editor';
import { editorScreen } from './editor.screen';

const POST_ID = 'a'.repeat(24);
const OTHER_USER = 'b'.repeat(24);
const LEASE_ON = { labs: { editorPresencePolling: true, editorLease: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const SAVED_LATER_AT = '2026-01-01T00:05:00.000Z';

type Asked = 'hold' | 'take' | 'watch' | undefined;
type LeaseRequest = { presence: [{ lease?: Asked }] };
type Active = { userId: string; resourceId: string; resourceType: 'post'; ts: number };

/**
 * The server's side of the lease. Nobody holds the post until a tab asks to;
 * `other` is someone else holding it, which a test sets and clears.
 */
function fakeLease(active: () => Active[] = () => []) {
  const me = currentUserResponse().users[0].id as string;
  const state: { other: string | null; mine: boolean } = { other: null, mine: false };
  const polls = fakeAdminEndpoint('POST', '/presence/', ({ body }) => {
    const asked = (body as LeaseRequest).presence[0].lease;
    if (asked === 'take' || (asked === 'hold' && state.other === null)) {
      state.other = null;
      state.mine = true;
    } else if (asked === 'watch') {
      state.mine = false;
    }
    const held = state.other ? { userId: state.other, mine: false } : null;
    const lease = state.mine ? { userId: me, mine: true } : held;
    return { presence: [{ active: active(), lease, serverTime: Date.now() }] };
  });
  return { state, polls, me };
}

/** A published post, which is never saved in the background, as the server holds it now. */
function fakePublishedPost(
  current: () => { title: string; updated_at: string } = () => ({
    title: 'Published example',
    updated_at: LOADED_AT,
  }),
) {
  fakeEditorChrome();
  fakeAdminEndpoint('POST', '/presence/leave/', () => new Response(null, { status: 204 }));
  const published = post({ id: POST_ID, status: 'published', published_at: LOADED_AT });
  return fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), () => ({
    posts: [{ ...published, ...current() }],
  }));
}

const alex = () =>
  fakeUsers([staffUser({ id: OTHER_USER, name: 'Alex Smith', profile_image: null })]);

/** The poll otherwise due ten seconds on; a tab coming back into view asks at once. */
const pollNow = () => document.dispatchEvent(new Event('visibilitychange'));

// Captured before any test stubs it, so afterEach can put it back.
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function recordClipboard(): string[] {
  const copied: string[] = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (text: string) => {
        copied.push(text);
        return Promise.resolve();
      },
    },
  });
  return copied;
}

const avatar = () => page.getByTestId(editorLeaseAvatar);
const card = () => page.getByTestId(editorLeaseCard);
/** The title is a plain field that follows the same lock as the body. */
const canvasLocked = () => (editorScreen.titleInput().element() as HTMLTextAreaElement).readOnly;
const asked = (requests: { body: unknown }[]) =>
  requests.map((request) => (request.body as LeaseRequest).presence[0].lease);

async function open(options: object = LEASE_ON) {
  await renderAdminApp(`/editor/post/${POST_ID}`, options);
  await expect.element(editorScreen.titleInput()).toHaveValue('Published example');
}

describe('Post editor lease', () => {
  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('opens for editing without taking the post from anyone', async () => {
    fakePublishedPost();
    const { polls } = fakeLease();
    await open();
    await expect.poll(() => asked(polls.requests)).toContain('watch');
    await expect.poll(canvasLocked).toBe(false);
    expect(asked(polls.requests)).not.toContain('hold');
    await expect.element(avatar()).not.toBeInTheDocument();
    await expect.element(editorScreen.updateButton()).toBeInTheDocument();
  });

  it('takes the post with the first edit, not with the next poll', async () => {
    fakePublishedPost();
    const { polls, state } = fakeLease();
    await open();
    await expect.poll(canvasLocked).toBe(false);

    await editorScreen.titleInput().fill('My first edit');

    await expect.poll(() => asked(polls.requests)).toContain('hold');
    expect(state.mine).toBe(true);
    expect(canvasLocked()).toBe(false);
    await expect.element(editorScreen.titleInput()).toHaveValue('My first edit');
  });

  describe('while someone else is editing', () => {
    it('opens read-only, with a pill of a lock and their avatar as the one sign of it', async () => {
      fakePublishedPost();
      alex();
      fakeLease().state.other = OTHER_USER;
      await open();

      await expect.element(avatar()).toHaveAccessibleName('Alex Smith is editing this post');
      expect(canvasLocked()).toBe(true);
      await expect.element(editorScreen.body()).toHaveAttribute('contenteditable', 'false');
      await expect.element(editorScreen.updateButton()).toBeDisabled();
      // Quiet until asked.
      await expect.element(card()).not.toBeInTheDocument();

      await avatar().click();
      await expect.element(card()).toHaveTextContent('Alex Smith is editing this post.');
      await expect.element(card()).toHaveTextContent('Taking over will stop Alex from editing.');
    });

    it('says why when the writer types', async () => {
      fakePublishedPost();
      alex();
      fakeLease().state.other = OTHER_USER;
      await open();
      await expect.element(avatar()).toBeVisible();

      await userEvent.keyboard('x');

      await expect.element(card()).toHaveTextContent('Alex Smith is editing this post.');
      await expect.element(editorScreen.titleInput()).toHaveValue('Published example');
    });

    it('takes over from the card, reads the latest copy and then opens', async () => {
      const reads = fakePublishedPost();
      alex();
      const { polls, state } = fakeLease();
      state.other = OTHER_USER;
      await open();
      const readsBefore = reads.requests.length;

      await avatar().click();
      await card().getByRole('button', { name: 'Take over' }).click();
      await expect.element(card()).toHaveTextContent('Taking over this post…');
      expect(asked(polls.requests)).toContain('take');
      expect(canvasLocked()).toBe(true);

      await expect.element(avatar(), { timeout: 8_000 }).not.toBeInTheDocument();
      await expect.poll(canvasLocked).toBe(false);
      expect(reads.requests.length).toBeGreaterThan(readsBefore);
    });

    it('reads the latest copy and opens by itself once they have gone', async () => {
      let current = { title: 'Published example', updated_at: LOADED_AT };
      fakePublishedPost(() => current);
      alex();
      const { polls, state } = fakeLease();
      state.other = OTHER_USER;
      await open();
      await expect.element(avatar()).toBeVisible();

      current = { title: 'Saved by Alex', updated_at: SAVED_LATER_AT };
      state.other = null;
      pollNow();

      await expect.element(editorScreen.titleInput()).toHaveValue('Saved by Alex');
      await expect.element(avatar()).not.toBeInTheDocument();
      await expect.poll(canvasLocked).toBe(false);
      // Free to edit is not the same as editing: the tab still only watches.
      expect(asked(polls.requests)).not.toContain('hold');
    });

    it('shows them once, in the lease pill, and everyone else in the avatar row', async () => {
      const reader = 'd'.repeat(24);
      fakePublishedPost();
      fakeUsers([
        staffUser({ id: OTHER_USER, name: 'Alex Smith', profile_image: null }),
        staffUser({ id: reader, name: 'Robin Reader', profile_image: null }),
      ]);
      const present = (userId: string): Active => ({
        userId,
        resourceId: POST_ID,
        resourceType: 'post',
        ts: Date.now(),
      });
      fakeLease(() => [present(OTHER_USER), present(reader)]).state.other = OTHER_USER;
      await open({ labs: { ...LEASE_ON.labs, editorPresence: true } });

      await expect.element(avatar()).toHaveAccessibleName('Alex Smith is editing this post');
      const others = page.getByTestId('presence-avatars');
      await expect.element(others.getByLabelText('Robin Reader has this post open')).toBeVisible();
      await expect.element(others.getByLabelText(/Alex Smith/)).not.toBeInTheDocument();
    });
  });

  it('stands the writer’s own avatar in for their other tab', async () => {
    fakePublishedPost();
    const { state, me } = fakeLease();
    state.other = me;
    await open();

    await expect
      .element(avatar())
      .toHaveAccessibleName('This post is being edited in another of your tabs');
    await avatar().click();
    await expect.element(card().getByRole('button', { name: 'Edit here' })).toBeVisible();
  });

  it('puts back what was typed, and locks, when someone else began a moment earlier', async () => {
    fakePublishedPost();
    alex();
    const { state } = fakeLease();
    await open();
    await expect.poll(canvasLocked).toBe(false);

    // They took it since this tab last asked, which it has yet to learn.
    state.other = OTHER_USER;
    await editorScreen.titleInput().fill('Typed a moment too late');

    await expect.element(editorScreen.titleInput()).toHaveValue('Published example');
    await expect.poll(canvasLocked).toBe(true);
    // Said without being asked, since the writer saw their words go.
    await expect.element(card()).toHaveTextContent('Alex Smith is editing this post.');
    await expect.element(card()).toHaveTextContent('so what you typed was not kept');
  });

  it('loads the latest copy over the first edit when the post had moved on unseen', async () => {
    let current = { title: 'Published example', updated_at: LOADED_AT };
    fakePublishedPost(() => current);
    const { state } = fakeLease();
    await open();
    await expect.poll(canvasLocked).toBe(false);

    // Saved by someone who came and went between two polls.
    current = { title: 'Saved by Alex', updated_at: SAVED_LATER_AT };
    await editorScreen.titleInput().fill('Typed on the old copy');

    await expect.element(editorScreen.titleInput()).toHaveValue('Saved by Alex');
    await expect.element(page.getByText('A newer version was saved elsewhere')).toBeVisible();
    expect(state.mine).toBe(true);
    expect(canvasLocked()).toBe(false);
  });

  describe('with unsaved work when the lease is taken', () => {
    /** Edits the title, which takes the lease, then loses it to Alex. */
    async function loseLeaseWithUnsavedTitle(
      current: () => { title: string; updated_at: string } = () => ({
        title: 'Published example',
        updated_at: LOADED_AT,
      }),
    ) {
      const reads = fakePublishedPost(current);
      alex();
      const { state } = fakeLease();
      await open();
      await expect.poll(canvasLocked).toBe(false);
      await editorScreen.titleInput().fill('My unsaved title');
      await expect.poll(() => state.mine).toBe(true);

      state.mine = false;
      state.other = OTHER_USER;
      pollNow();
      // Said without being asked.
      await expect.element(card()).toHaveTextContent('Alex Smith took over editing this post.');
      await expect.element(card()).toHaveTextContent('Your unsaved changes are still here.');
      return reads;
    }

    it('keeps it in the tab and offers a copy', async () => {
      const copied = recordClipboard();
      await loseLeaseWithUnsavedTitle();

      expect(canvasLocked()).toBe(true);
      await expect.element(editorScreen.titleInput()).toHaveValue('My unsaved title');
      await card().getByRole('button', { name: 'Copy content' }).click();
      await expect.poll(() => copied.join('')).toContain('My unsaved title');
    });

    it('opens as it is on taking the lease back when nothing was saved meanwhile', async () => {
      await loseLeaseWithUnsavedTitle();

      await card().getByRole('button', { name: 'Take over' }).click();

      await expect.element(avatar(), { timeout: 8_000 }).not.toBeInTheDocument();
      await expect.poll(canvasLocked).toBe(false);
      await expect.element(editorScreen.titleInput()).toHaveValue('My unsaved title');
    });

    it('stays read-only over a version saved meanwhile until the writer reloads', async () => {
      let current = { title: 'Published example', updated_at: LOADED_AT };
      const reads = await loseLeaseWithUnsavedTitle(() => current);
      current = { title: 'Saved by Alex', updated_at: SAVED_LATER_AT };

      await card().getByRole('button', { name: 'Take over' }).click();

      const notice = page.getByTestId(editorLeaseOutdated);
      await expect
        .element(notice, { timeout: 8_000 })
        .toHaveTextContent(
          'Someone saved a newer version of this post. Your unsaved changes are from an older one.',
        );
      expect(canvasLocked()).toBe(true);
      await expect.element(editorScreen.titleInput()).toHaveValue('My unsaved title');
      await expect.element(editorScreen.updateButton()).toBeDisabled();

      const readsBefore = reads.requests.length;
      await notice.getByRole('button', { name: 'Reload' }).click();
      // Nothing is read until the writer has agreed to lose the unsaved work.
      await expect.element(page.getByTestId(editorLeaseReloadConfirm)).toBeVisible();
      expect(reads.requests.length).toBe(readsBefore);
      await page
        .getByTestId(editorLeaseReloadConfirm)
        .getByRole('button', { name: 'Discard and reload' })
        .click();

      await expect.element(editorScreen.titleInput()).toHaveValue('Saved by Alex');
      await expect.element(notice).not.toBeInTheDocument();
      await expect.poll(canvasLocked).toBe(false);
    });
  });

  it('asks about no lease and locks nothing while the flag is off', async () => {
    fakePublishedPost();
    alex();
    const { polls, state } = fakeLease();
    state.other = OTHER_USER;
    await open({ labs: { editorPresencePolling: true } });
    await expect.poll(() => polls.requests.length).toBeGreaterThan(0);
    expect(asked(polls.requests)).toEqual(polls.requests.map(() => undefined));
    expect(canvasLocked()).toBe(false);
    await expect.element(avatar()).not.toBeInTheDocument();
  });

  it('stays editable against a server that refuses the lease field', async () => {
    fakePublishedPost();
    const polls = fakeAdminEndpoint('POST', '/presence/', ({ body }) =>
      (body as LeaseRequest).presence[0].lease
        ? new Response(JSON.stringify({ errors: [{ type: 'ValidationError', message: 'no' }] }), {
            status: 422,
            headers: { 'Content-Type': 'application/json' },
          })
        : { presence: [{ active: [], serverTime: Date.now() }] },
    );
    await open();
    await expect.poll(() => asked(polls.requests)).toEqual(['watch', undefined]);
    await expect.poll(canvasLocked).toBe(false);
    await expect.element(avatar()).not.toBeInTheDocument();
  });
});
