import { describe, expect, it } from 'vitest';
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
import { editorLeaseBanner } from '@tryghost/test-data/selectors/editor';
import { editorScreen } from './editor.screen';

const POST_ID = 'a'.repeat(24);
const OTHER_USER = 'b'.repeat(24);
const LEASE_ON = { labs: { editorPresencePolling: true, editorLease: true } };

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

const banner = () => page.getByTestId(editorLeaseBanner);
/** The canvas takes no input while another tab holds the post. */
const canvasLocked = () => editorScreen.root().element().querySelector('[inert]') !== null;
const asked = (requests: { body: unknown }[]) =>
  requests.map((request) => (request.body as LeaseRequest).presence[0].lease);

describe('Post editor lease', () => {
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
    await expect.element(editorScreen.publishButton()).toBeDisabled();
    await expect.element(editorScreen.titleInput()).toHaveValue('Lease example');
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
});
