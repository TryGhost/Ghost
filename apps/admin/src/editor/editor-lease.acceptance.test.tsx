import { afterEach, describe, expect, it, onTestFinished } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';
import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeNewsletters,
  fakeTags,
  fakeTiers,
  fakeUsers,
  post,
  postRevision,
  renderAdminApp,
  staffUser,
  tag,
} from '@test-utils/acceptance';
import {
  editorLeaseAvatar,
  editorLeaseCard,
  editorLeaseOutdated,
  editorLeaseReloadConfirm,
  settingsTagsList,
} from '@tryghost/test-data/selectors/editor';
import { editorScreen } from './editor.screen';
import { publishScreen } from './publish/publish.screen';

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
  revisions: ReturnType<typeof postRevision>[] = [],
) {
  fakeEditorChrome();
  fakeAdminEndpoint('POST', '/presence/leave/', () => new Response(null, { status: 204 }));
  const published = post({
    id: POST_ID,
    status: 'published',
    published_at: LOADED_AT,
    post_revisions: revisions,
  });
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
const takeoverDialog = () =>
  page.getByRole('alertdialog', { name: /^(Take over editing|Edit in this tab)\?$/ });
async function confirmTakeover(action = 'Take over') {
  await expect.element(takeoverDialog()).toBeVisible();
  await takeoverDialog().getByRole('button', { name: action, exact: true }).click();
}
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
    it('gives grouped fields and tag pickers the same disabled surface as textareas', async () => {
      fakePublishedPost();
      alex();
      fakeLease().state.other = OTHER_USER;
      await open();
      await editorScreen.settingsToggle().click();

      const disabledSurface = getComputedStyle(
        editorScreen.settingsExcerpt().element(),
      ).backgroundColor;
      for (const field of [
        editorScreen.settingsSlug(),
        editorScreen.settingsPublishDate(),
        editorScreen.settingsPublishTime(),
      ]) {
        const group = field.element().closest('[data-slot="input-group"]');
        expect(group).not.toBeNull();
        expect(getComputedStyle(group!).backgroundColor).toBe(disabledSurface);
      }
      expect(getComputedStyle(editorScreen.settingsTagsField().element()).backgroundColor).toBe(
        disabledSurface,
      );
    });

    it('closes the tag list and disables tag editing when another tab takes over', async () => {
      fakePublishedPost();
      alex();
      fakeTags([tag({ name: 'News' })]);
      const saves = fakeAdminEndpoint(
        'PUT',
        new RegExp(`^/posts/${POST_ID}/\\?`),
        ({ body }) => body,
      );
      const { state } = fakeLease();
      await open();
      await expect.poll(canvasLocked).toBe(false);
      await editorScreen.settingsToggle().click();
      await editorScreen.settingsTagsInput().click();
      await expect.element(editorScreen.settingsTagOption('News')).toBeVisible();

      state.other = OTHER_USER;
      pollNow();

      await expect.poll(canvasLocked).toBe(true);
      await expect.element(page.getByTestId(settingsTagsList)).not.toBeInTheDocument();
      await expect.element(editorScreen.settingsTagsInput()).toHaveAttribute('disabled');
      expect(saves.requests).toHaveLength(0);
    });

    it('disables document settings and offers a takeover above them, then enables them', async () => {
      fakePublishedPost();
      alex();
      fakeLease().state.other = OTHER_USER;
      await open();
      await editorScreen.settingsToggle().click();

      const sidebar = editorScreen.settingsSidebar();
      await expect.element(sidebar.getByText('Post settings are locked')).not.toBeInTheDocument();
      await expect.element(sidebar.getByText('Alex Smith is editing this post.')).toBeVisible();
      await expect
        .element(
          sidebar.getByText(
            'Taking over will stop Alex from editing, and they may lose unsaved content.',
          ),
        )
        .not.toBeInTheDocument();
      await expect.element(editorScreen.settingsSlug()).toBeDisabled();
      await expect.element(editorScreen.settingsFeatured()).toBeDisabled();
      const fields = sidebar
        .element()
        .querySelectorAll('fieldset input, fieldset textarea, fieldset button');
      expect(fields.length).toBeGreaterThan(0);
      expect(Array.from(fields).every((field) => field.matches(':disabled'))).toBe(true);

      await sidebar.getByRole('button', { name: 'Take over' }).click();
      await expect
        .element(takeoverDialog())
        .toHaveTextContent(
          'Taking over will stop Alex from editing, and they may lose unsaved content.',
        );
      await confirmTakeover();
      await expect.element(sidebar.getByText('Taking over this post…')).toBeVisible();
      await expect.element(editorScreen.settingsSlug(), { timeout: 8_000 }).toBeEnabled();
      await expect
        .element(sidebar.getByText('Alex Smith is editing this post.'))
        .not.toBeInTheDocument();
    });

    it('keeps history, editor font, shortcuts and help usable while document settings are locked', async () => {
      fakeAdminEndpoint('PUT', /^\/users\/\w+\//, ({ body }) => body);
      fakePublishedPost(undefined, [
        postRevision({
          id: 'older',
          lexical: buildLexicalParagraph('Earlier words'),
          created_at: '2025-12-01T00:00:00.000Z',
        }),
        postRevision({
          id: 'newest',
          lexical: buildLexicalParagraph('Current words'),
          created_at: LOADED_AT,
        }),
      ]);
      alex();
      const { state, me } = fakeLease();
      state.other = OTHER_USER;
      await open();
      await editorScreen.settingsToggle().click();

      await editorScreen.fontToggle().click();
      await editorScreen.fontOption('Sans').click();
      await expect.element(editorScreen.fontOption('Sans')).toBeChecked();
      await expect.element(editorScreen.settingsEditorHelp()).toBeVisible();
      expect(editorScreen.settingsEditorHelp().element().closest('[inert]')).toBeNull();

      await editorScreen.settingsSubviewRow('Keyboard shortcuts').click();
      await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
      await editorScreen.settingsSubviewBack('Close keyboard shortcuts panel').click();

      await editorScreen.settingsPostHistory().click();
      await expect.element(editorScreen.postHistoryModal()).toBeVisible();
      await editorScreen.postHistoryRevision(1).select().click();
      await expect.element(editorScreen.postHistoryRevision(1).restore()).toBeDisabled();

      state.other = null;
      pollNow();
      await expect.element(editorScreen.postHistoryRevision(1).restore()).toBeEnabled();
      await editorScreen.postHistoryRevision(1).restore().click();
      await expect.element(editorScreen.restoreConfirm()).toBeVisible();

      state.other = me;
      pollNow();
      await expect.element(editorScreen.restoreConfirm()).not.toBeInTheDocument();
      await expect.element(editorScreen.postHistoryModal()).toBeVisible();
      await expect.element(editorScreen.postHistoryRevision(1).restore()).toBeDisabled();
    });

    it('returns from document settings to the usable footer when the lease is lost', async () => {
      fakePublishedPost();
      const { state, me } = fakeLease();
      await open();
      await expect.poll(canvasLocked).toBe(false);
      await editorScreen.settingsToggle().click();
      await editorScreen.settingsSubviewRow('Meta data').click();
      await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();

      state.other = me;
      pollNow();

      await expect.element(editorScreen.settingsSubviewPane()).not.toBeInTheDocument();
      const sidebar = editorScreen.settingsSidebar();
      await expect
        .element(sidebar.getByText('This post is being edited in another of your tabs.'))
        .toBeVisible();
      await expect.element(sidebar.getByRole('button', { name: 'Edit here' })).toBeEnabled();
      await expect.element(editorScreen.settingsSlug()).toBeDisabled();
      await editorScreen.settingsSubviewRow('Keyboard shortcuts').click();
      await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
    });

    it('opens read-only, with a pill of a lock and their avatar', async () => {
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
      await expect
        .element(card())
        .not.toHaveTextContent(
          'Taking over will stop Alex from editing, and they may lose unsaved content.',
        );
    });

    it('lets a keyboard user open the avatar card and reach takeover', async () => {
      fakePublishedPost();
      alex();
      fakeLease().state.other = OTHER_USER;
      await open();
      await expect.element(avatar()).toBeVisible();
      avatar().element().focus();

      await userEvent.keyboard('{Enter}');

      const takeOver = card().getByRole('button', { name: 'Take over', exact: true });
      await expect.element(takeOver).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect.element(takeoverDialog()).toBeVisible();
    });

    it('keeps writing focus when the avatar card opens on hover', async () => {
      fakePublishedPost();
      alex();
      fakeLease().state.other = OTHER_USER;
      await open();
      editorScreen.titleInput().element().focus();

      await userEvent.hover(avatar());

      await expect.element(card()).toBeVisible();
      await expect.element(editorScreen.titleInput()).toHaveFocus();
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
      await expect
        .element(takeoverDialog())
        .toHaveTextContent(
          'Taking over will stop Alex from editing, and they may lose unsaved content.',
        );
      expect(asked(polls.requests)).not.toContain('take');
      await takeoverDialog().getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect.element(takeoverDialog()).not.toBeInTheDocument();
      expect(canvasLocked()).toBe(true);
      expect(asked(polls.requests)).not.toContain('take');

      await avatar().click();
      await card().getByRole('button', { name: 'Take over' }).click();
      await confirmTakeover();
      await expect.element(avatar()).toHaveAccessibleName('Taking over this post');
      expect(asked(polls.requests)).toContain('take');
      expect(canvasLocked()).toBe(true);

      await expect.element(avatar(), { timeout: 8_000 }).not.toBeInTheDocument();
      await expect.poll(canvasLocked).toBe(false);
      expect(reads.requests.length).toBeGreaterThan(readsBefore);
      await expect
        .element(card().getByRole('status'))
        .toHaveTextContent('You’re now editing this post.');
      expect(card().element().querySelector('svg')).toHaveClass('text-state-success');
      // Reloading the editor can return focus to its new writing surface.
      editorScreen.titleInput().element().focus();
      await expect.element(editorScreen.titleInput()).toHaveFocus();
      editorScreen.body().element().focus();
      await expect.element(editorScreen.body()).toHaveFocus();
      // Outside-focus dismissal is deferred; check after that event has been handled.
      await new Promise((resolve) => {
        setTimeout(resolve, 200);
      });
      await expect
        .element(card().getByRole('status'))
        .toHaveTextContent('You’re now editing this post.');
      await expect.element(card()).not.toBeInTheDocument();
      const editing = page.getByRole('button', { name: 'You are editing this post', exact: true });
      await userEvent.hover(editing);
      await expect
        .element(page.getByRole('tooltip'))
        .toHaveTextContent('You are editing this post.');
    });

    it('shows success below the new owner’s avatar while the previous editor remains present', async () => {
      fakePublishedPost();
      alex();
      const { state } = fakeLease(() => [
        { userId: OTHER_USER, resourceId: POST_ID, resourceType: 'post', ts: Date.now() },
      ]);
      state.other = OTHER_USER;
      await open();
      await avatar().click();
      await card().getByRole('button', { name: 'Take over' }).click();
      await confirmTakeover();

      await expect
        .element(card(), { timeout: 14_000 })
        .toHaveTextContent('You’re now editing this post.');
      await expect.element(card()).toBeVisible();
      const editing = page.getByRole('button', { name: 'You are editing this post', exact: true });
      const anchor = editing.element().getBoundingClientRect();
      const popup = card().element().getBoundingClientRect();
      expect(popup.top).toBeGreaterThanOrEqual(anchor.bottom);
      expect(
        Math.abs((popup.left + popup.right) / 2 - (anchor.left + anchor.right) / 2),
      ).toBeLessThan(2);
    }, 20_000);

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

    it('dismisses a takeover confirmation if the other editor leaves before confirming', async () => {
      fakePublishedPost();
      alex();
      const { state, polls } = fakeLease();
      state.other = OTHER_USER;
      await open();
      await avatar().click();
      await card().getByRole('button', { name: 'Take over' }).click();
      await expect.element(takeoverDialog()).toBeVisible();

      state.other = null;
      pollNow();

      await expect.element(takeoverDialog()).not.toBeInTheDocument();
      await expect.poll(canvasLocked).toBe(false);
      expect(asked(polls.requests)).not.toContain('take');
    });

    it('dismisses takeover confirmation when another person becomes the editor', async () => {
      fakePublishedPost();
      alex();
      const { state, polls, me } = fakeLease();
      state.other = OTHER_USER;
      await open();
      await avatar().click();
      await card().getByRole('button', { name: 'Take over' }).click();
      await expect.element(takeoverDialog()).toBeVisible();

      // A poll can replace the holder directly, without a free lease in between.
      state.other = me;
      pollNow();

      await expect
        .element(avatar())
        .toHaveAttribute('aria-label', 'This post is being edited in another of your tabs');
      await expect.element(takeoverDialog()).not.toBeInTheDocument();
      expect(canvasLocked()).toBe(true);
      expect(asked(polls.requests)).not.toContain('take');
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

  it('closes a flow that was open when the post locked, so nothing is written from it', async () => {
    fakePublishedPost();
    alex();
    fakeTiers([]);
    fakeNewsletters([]);
    fakeAdminEndpoint('GET', /^\/members\/\?.*order=id/, {
      members: [],
      meta: { pagination: { page: 1, limit: 1, pages: 1, total: 20, next: null, prev: null } },
    });
    const saves = fakeAdminEndpoint('PUT', new RegExp(`^/posts/${POST_ID}/\\?`), () => ({
      posts: [post({ id: POST_ID, status: 'draft' })],
    }));
    const { state } = fakeLease();
    await open();
    await editorScreen.unpublishButton().click();
    await expect.element(publishScreen.updateFlow()).toBeVisible();

    state.other = OTHER_USER;
    pollNow();
    await expect.poll(canvasLocked).toBe(true);
    await expect.element(publishScreen.updateFlow()).not.toBeInTheDocument();
    expect(saves.requests).toHaveLength(0);

    // And it stays closed once the post opens again.
    state.other = null;
    pollNow();
    await expect.poll(canvasLocked).toBe(false);
    await expect.element(publishScreen.updateFlow()).not.toBeInTheDocument();
  });

  it('closes a delete confirmation that was open when the post locked', async () => {
    fakePublishedPost();
    alex();
    const { state } = fakeLease();
    await open();
    await editorScreen.settingsToggle().click();
    await editorScreen.settingsDelete().click();
    await expect.element(editorScreen.settingsDeleteDialog()).toBeVisible();

    state.other = OTHER_USER;
    pollNow();
    await expect.poll(canvasLocked).toBe(true);
    await expect.element(editorScreen.settingsDeleteDialog()).not.toBeInTheDocument();
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

  it('opens moments after taking over from the writer’s own other tab, once that tab says it knows', async () => {
    fakePublishedPost();
    const { state, me } = fakeLease();
    state.other = me;
    await open();
    // The other tab, as this one hears it: told of the takeover, it answers that it knows.
    const otherTab = new BroadcastChannel('ghost-editor-lease');
    onTestFinished(() => otherTab.close());
    const told: string[] = [];
    otherTab.onmessage = ({
      data,
    }: MessageEvent<{ type: string; lease: string; from: string }>) => {
      told.push(data.type);
      otherTab.postMessage({ type: 'heard', lease: data.lease, from: 'other-tab', to: data.from });
    };

    await avatar().click();
    await card().getByRole('button', { name: 'Edit here' }).click();
    await confirmTakeover('Edit here');
    await expect.poll(() => told).toEqual(['taken']);
    // Without the other tab's word this waits twelve seconds, since the server never lists it.
    await expect.poll(canvasLocked, { timeout: 7_000 }).toBe(false);
    await expect
      .element(card().getByRole('status'))
      .toHaveTextContent('You’re now editing this post.');
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

    it('shows the normal editing status when the takeover notice is dismissed and reopened', async () => {
      await loseLeaseWithUnsavedTitle();
      await editorScreen.titleInput().click();
      await expect.element(card()).not.toBeInTheDocument();

      await userEvent.hover(avatar());

      await expect.element(card()).toHaveTextContent('Alex Smith is editing this post.');
      await expect.element(card()).not.toHaveTextContent('Alex Smith took over editing this post.');
      await expect.element(card()).toHaveTextContent('Your unsaved changes are still here.');
      await expect.element(card().getByRole('button', { name: 'Copy content' })).toBeVisible();
    });

    it('opens as it is on taking the lease back when nothing was saved meanwhile', async () => {
      await loseLeaseWithUnsavedTitle();

      await card().getByRole('button', { name: 'Take over' }).click();
      await confirmTakeover();

      await expect.element(avatar(), { timeout: 8_000 }).not.toBeInTheDocument();
      await expect.poll(canvasLocked).toBe(false);
      await expect.element(editorScreen.titleInput()).toHaveValue('My unsaved title');
    });

    it('stays read-only over a version saved meanwhile until the writer reloads', async () => {
      let current = { title: 'Published example', updated_at: LOADED_AT };
      const reads = await loseLeaseWithUnsavedTitle(() => current);
      current = { title: 'Saved by Alex', updated_at: SAVED_LATER_AT };

      await card().getByRole('button', { name: 'Take over' }).click();
      await confirmTakeover();

      const notice = page.getByTestId(editorLeaseOutdated);
      await expect
        .element(notice, { timeout: 8_000 })
        .toHaveTextContent(
          'Someone saved a newer version of this post. Your unsaved changes are from an older one.',
        );
      expect(canvasLocked()).toBe(true);
      await expect.element(editorScreen.titleInput()).toHaveValue('My unsaved title');
      await expect.element(editorScreen.updateButton()).toBeDisabled();
      await expect
        .element(page.getByText('You’re now editing this post.', { exact: true }))
        .not.toBeInTheDocument();

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
