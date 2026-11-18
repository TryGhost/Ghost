import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeUsers,
  post,
  renderAdminApp,
  staffUser,
} from '@test-utils/acceptance';
import { editorLeaseBanner, editorLeaseReloadConfirm } from '@tryghost/test-data/selectors/editor';
import { editorScreen } from './editor.screen';

const POST_ID = 'a'.repeat(24);
const OTHER_USER = 'b'.repeat(24);
const LEASE_ON = { labs: { editorPresencePolling: true, editorLease: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const SAVED_LATER_AT = '2026-01-01T00:05:00.000Z';

type LeaseRequest = { presence: [{ lease?: 'hold' | 'take' }] };
type Lease = { userId: string; mine: boolean };

/** Answers each poll with the lease `holder` decides, given what the poll asked for. */
function fakePresence(holder: (asked: 'hold' | 'take' | undefined) => Lease | undefined) {
  return fakeAdminEndpoint('POST', '/presence/', ({ body }) => {
    const lease = holder((body as LeaseRequest).presence[0].lease);
    return { presence: [{ active: [], ...(lease ? { lease } : {}), serverTime: Date.now() }] };
  });
}

function fakeEditor(title = 'Lease example') {
  fakeEditorChrome();
  fakeAdminEndpoint('POST', '/presence/leave/', () => new Response(null, { status: 204 }));
  return fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
    posts: [post({ id: POST_ID, title })],
  });
}

/** A published post, which is never saved in the background, as the server holds it now. */
function fakePublishedPost(current: () => { title: string; updated_at: string }) {
  fakeEditorChrome();
  fakeAdminEndpoint('POST', '/presence/leave/', () => new Response(null, { status: 204 }));
  const published = post({ id: POST_ID, status: 'published', published_at: LOADED_AT });
  return fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), () => ({
    posts: [{ ...published, ...current() }],
  }));
}

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

const banner = () => page.getByTestId(editorLeaseBanner);
/** The title is a plain field that follows the same lock as the body. */
const canvasLocked = () => (editorScreen.titleInput().element() as HTMLTextAreaElement).readOnly;
const asked = (requests: { body: unknown }[]) =>
  requests.map((request) => (request.body as LeaseRequest).presence[0].lease);

describe('Post editor lease', () => {
  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('opens for editing in the tab the server names, with no banner', async () => {
    fakeEditor();
    const presence = fakePresence(() => ({ userId: 'c'.repeat(24), mine: true }));
    await renderAdminApp(`/editor/post/${POST_ID}`, LEASE_ON);
    await expect.element(editorScreen.titleInput()).toHaveValue('Lease example');
    await expect.poll(() => asked(presence.requests)).toContain('hold');
    await expect.poll(canvasLocked).toBe(false);
    await expect.element(banner()).not.toBeInTheDocument();
    await expect.element(editorScreen.publishButton()).toBeEnabled();
  });

  it('opens read-only and names the holder when someone else has the post', async () => {
    fakeEditor();
    fakeUsers([staffUser({ id: OTHER_USER, name: 'Alex Smith', profile_image: null })]);
    fakePresence(() => ({ userId: OTHER_USER, mine: false }));
    await renderAdminApp(`/editor/post/${POST_ID}`, LEASE_ON);
    await expect.element(banner()).toHaveTextContent('Alex Smith is editing this post.');
    expect(canvasLocked()).toBe(true);
    await expect.element(editorScreen.body()).toHaveAttribute('contenteditable', 'false');
    await expect.element(editorScreen.publishButton()).toBeDisabled();
    await expect.element(editorScreen.titleInput()).toHaveValue('Lease example');
  });

  it('shows the holder in the banner and only the others in the avatar row', async () => {
    const reader = 'd'.repeat(24);
    fakeEditor();
    fakeUsers([
      staffUser({ id: OTHER_USER, name: 'Alex Smith', profile_image: null }),
      staffUser({ id: reader, name: 'Robin Reader', profile_image: null }),
    ]);
    fakeAdminEndpoint('POST', '/presence/', () => {
      const ts = Date.now();
      const active = [OTHER_USER, reader].map((userId) => ({
        userId,
        resourceId: POST_ID,
        resourceType: 'post',
        ts,
      }));
      return {
        presence: [{ active, lease: { userId: OTHER_USER, mine: false }, serverTime: ts }],
      };
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, {
      labs: { ...LEASE_ON.labs, editorPresence: true },
    });
    await expect.element(banner()).toHaveTextContent('Alex Smith is editing this post.');
    const avatars = page.getByTestId('presence-avatars');
    await expect.element(avatars.getByLabelText('Robin Reader has this post open')).toBeVisible();
    await expect.element(avatars.getByLabelText(/Alex Smith/)).not.toBeInTheDocument();
  });

  it('takes over, reads the latest copy and then opens for editing', async () => {
    const reads = fakeEditor();
    fakeUsers([staffUser({ id: OTHER_USER, name: 'Alex Smith', profile_image: null })]);
    let taken = false;
    const presence = fakePresence((request) => {
      taken ||= request === 'take';
      return taken ? { userId: 'c'.repeat(24), mine: true } : { userId: OTHER_USER, mine: false };
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, LEASE_ON);
    await expect.element(banner()).toHaveTextContent('Alex Smith is editing this post.');
    const readsBefore = reads.requests.length;

    await banner().getByRole('button', { name: 'Take over' }).click();
    await expect.element(banner()).toHaveTextContent('Taking over this post…');
    expect(asked(presence.requests)).toContain('take');
    expect(canvasLocked()).toBe(true);

    await expect.element(banner(), { timeout: 8_000 }).not.toBeInTheDocument();
    await expect.poll(canvasLocked).toBe(false);
    expect(reads.requests.length).toBeGreaterThan(readsBefore);
    await expect.element(editorScreen.publishButton()).toBeEnabled();
  });

  it('offers to edit here when the writer’s own other tab holds the post', async () => {
    fakeEditor();
    // The harness's signed-in user, so the holder is the writer themselves.
    const me = currentUserResponse().users[0].id as string;
    fakePresence(() => ({ userId: me, mine: false }));
    await renderAdminApp(`/editor/post/${POST_ID}`, LEASE_ON);
    await expect
      .element(banner())
      .toHaveTextContent('This post is being edited in another of your tabs.');
    await expect.element(banner().getByRole('button', { name: 'Edit here' })).toBeVisible();
  });

  it('asks for no lease and locks nothing while the flag is off', async () => {
    fakeEditor();
    const presence = fakePresence(() => ({ userId: OTHER_USER, mine: false }));
    await renderAdminApp(`/editor/post/${POST_ID}`, { labs: { editorPresencePolling: true } });
    await expect.element(editorScreen.titleInput()).toHaveValue('Lease example');
    await expect.poll(() => presence.requests.length).toBeGreaterThan(0);
    expect(asked(presence.requests)).toEqual(presence.requests.map(() => undefined));
    expect(canvasLocked()).toBe(false);
    await expect.element(banner()).not.toBeInTheDocument();
  });

  it('stays editable against a server that refuses the lease field', async () => {
    fakeEditor();
    const presence = fakeAdminEndpoint('POST', '/presence/', ({ body }) =>
      (body as LeaseRequest).presence[0].lease
        ? new Response(JSON.stringify({ errors: [{ type: 'ValidationError', message: 'no' }] }), {
            status: 422,
            headers: { 'Content-Type': 'application/json' },
          })
        : { presence: [{ active: [], serverTime: Date.now() }] },
    );
    await renderAdminApp(`/editor/post/${POST_ID}`, LEASE_ON);
    await expect.poll(() => asked(presence.requests)).toEqual(['hold', undefined]);
    await expect.poll(canvasLocked).toBe(false);
    await expect.element(banner()).not.toBeInTheDocument();
  });

  describe('with unsaved work', () => {
    const me = 'c'.repeat(24);
    const loaded = { title: 'Published example', updated_at: LOADED_AT };

    /** Holds the post, edits its title without saving, then loses the lease to Alex. */
    async function loseLeaseWithUnsavedTitle(current: () => typeof loaded = () => loaded) {
      let lease: Lease = { userId: me, mine: true };
      const reads = fakePublishedPost(current);
      fakeUsers([staffUser({ id: OTHER_USER, name: 'Alex Smith', profile_image: null })]);
      fakePresence((request) => {
        if (request === 'take') {
          lease = { userId: me, mine: true };
        }
        return lease;
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, LEASE_ON);
      await expect.element(editorScreen.titleInput()).toHaveValue('Published example');
      await expect.poll(canvasLocked).toBe(false);
      await editorScreen.titleInput().fill('My unsaved title');

      lease = { userId: OTHER_USER, mine: false };
      pollNow();
      await expect
        .element(banner())
        .toHaveTextContent(
          'Alex Smith took over editing this post. Your unsaved changes are still here.',
        );
      return reads;
    }

    it('keeps it in a tab that loses the lease, and offers a copy', async () => {
      const copied = recordClipboard();
      await loseLeaseWithUnsavedTitle();

      expect(canvasLocked()).toBe(true);
      await expect.element(editorScreen.titleInput()).toHaveValue('My unsaved title');
      await banner().getByRole('button', { name: 'Copy content' }).click();
      await expect.poll(() => copied.join('')).toContain('My unsaved title');
    });

    it('opens as it is on taking the lease back when nothing was saved meanwhile', async () => {
      await loseLeaseWithUnsavedTitle();

      await banner().getByRole('button', { name: 'Take over' }).click();

      await expect.element(banner(), { timeout: 8_000 }).not.toBeInTheDocument();
      await expect.poll(canvasLocked).toBe(false);
      await expect.element(editorScreen.titleInput()).toHaveValue('My unsaved title');
    });

    it('stays read-only over a version saved meanwhile until the writer reloads', async () => {
      let current = loaded;
      const reads = await loseLeaseWithUnsavedTitle(() => current);
      current = { title: 'Saved by Alex', updated_at: SAVED_LATER_AT };

      await banner().getByRole('button', { name: 'Take over' }).click();

      await expect
        .element(banner(), { timeout: 8_000 })
        .toHaveTextContent(
          'Someone saved a newer version of this post. Your unsaved changes are from an older one.',
        );
      expect(canvasLocked()).toBe(true);
      await expect.element(editorScreen.titleInput()).toHaveValue('My unsaved title');
      await expect.element(editorScreen.updateButton()).toBeDisabled();

      const readsBefore = reads.requests.length;
      await banner().getByRole('button', { name: 'Reload' }).click();
      // Nothing is read until the writer has agreed to lose the unsaved work.
      await expect.element(page.getByTestId(editorLeaseReloadConfirm)).toBeVisible();
      expect(reads.requests.length).toBe(readsBefore);
      await page
        .getByTestId(editorLeaseReloadConfirm)
        .getByRole('button', { name: 'Discard and reload' })
        .click();

      await expect.element(editorScreen.titleInput()).toHaveValue('Saved by Alex');
      await expect.element(banner()).not.toBeInTheDocument();
      await expect.poll(canvasLocked).toBe(false);
    });
  });
});
