import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentRoute,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakePosts,
  fakePostsListScreen,
  post,
  renderAdminApp,
  unsavedChangesGuarded,
  withFastAutosave,
  withoutAutosave,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { LEAVE_DECISION_DEADLINE_MS } from '@/editor/session/leave-guard';
import { postsListScreen } from '@/posts/list/posts-list.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const OTHER_POST_ID = 'other1';
const NEW_POST_ID = 'new789';
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const CREATED_AT = '2026-01-01T00:00:05.000Z';
// The posts list is React-owned here so the back link is a router link and the
// blocker sees the navigation; the hash-anchor path pins it to Ember below.
// Each test names its own autosave regime, since the debounce decides whether a write
// came from the exit or from an autosave; naming none leaves the editor's real 3s.
const FLAG_ON: RenderAdminAppOptions = { labs: { editorReact: true } };

/**
 * A raw `#/…` anchor into an Ember-owned route. The router only sees it as a
 * POP it cannot block, so the hash-link guard has to intercept the click.
 */
function nativeHashAnchor(): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.setAttribute('href', '#/pro');
  anchor.textContent = 'Billing';
  document.body.append(anchor);
  nativeAnchors.push(anchor);
  return anchor;
}

const nativeAnchors: HTMLAnchorElement[] = [];

afterEach(() => {
  nativeAnchors.splice(0).forEach((anchor) => anchor.remove());
});

type SavedPost = ReturnType<typeof post>;

function fakeEditablePost(overrides: Partial<SavedPost> = {}, { failSaves = false } = {}) {
  fakeEditorChrome();
  let current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    tags: [],
    ...overrides,
  });
  let saves = 0;

  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
  fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), () => ({ posts: [current] }));

  const saveApi = fakeAdminEndpoint(
    'PUT',
    new RegExp(`^/posts/${POST_ID}/\\?`),
    ({ body }) => {
      saves += 1;
      if (failSaves) {
        return { errors: [{ type: 'InternalServerError', message: 'Something went wrong.' }] };
      }
      const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
      current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
      return { posts: [current] };
    },
    { status: failSaves ? 500 : 200 },
  );

  return saveApi;
}

function fakeNewPost({ failUpdates = false } = {}) {
  fakeEditorChrome();
  fakeAdminEndpoint('GET', /^\/slugs\/post\/untitled\//, { slugs: [{ slug: 'untitled' }] });
  let created = post({
    id: NEW_POST_ID,
    title: '(Untitled)',
    slug: 'untitled',
    status: 'draft',
    updated_at: CREATED_AT,
    published_at: null,
    tags: [],
  });
  const createResponse = deferred<{ posts: SavedPost[] }>();
  const createApi = fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => {
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    created = { ...created, ...submitted, id: NEW_POST_ID, updated_at: CREATED_AT };
    return createResponse.promise;
  });
  fakeAdminEndpoint('GET', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({ posts: [created] }));
  const updateApi = fakeAdminEndpoint(
    'PUT',
    new RegExp(`^/posts/${NEW_POST_ID}/\\?`),
    ({ body }) => {
      if (failUpdates) {
        return { errors: [{ type: 'InternalServerError', message: 'Something went wrong.' }] };
      }
      const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
      created = { ...created, ...submitted, updated_at: '2026-01-01T00:00:09.000Z' };
      return { posts: [created] };
    },
    { status: failUpdates ? 500 : 200 },
  );

  return {
    createApi,
    updateApi,
    resolveCreate: () => createResponse.resolve({ posts: [created] }),
  };
}

function fakeDeferredSave() {
  fakeEditorChrome();
  let current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    tags: [],
  });
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
  fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), () => ({ posts: [current] }));

  const saveResponse = deferred<{ posts: SavedPost[] } | Response>();
  const saveApi = fakeAdminEndpoint('PUT', new RegExp(`^/posts/${POST_ID}/\\?`), ({ body }) => {
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    current = { ...current, ...submitted, updated_at: '2026-01-01T00:00:01.000Z' };
    return saveResponse.promise;
  });

  return {
    saveApi,
    resolveSave: () => saveResponse.resolve({ posts: [current] }),
    failSave: () =>
      saveResponse.resolve(
        Response.json(
          { errors: [{ type: 'InternalServerError', message: 'Something went wrong.' }] },
          { status: 500 },
        ),
      ),
  };
}

/** A draft whose saves find the session gone until `restoreSaves` answers them again. */
function fakeExpiredSaves() {
  fakeEditorChrome();
  const loaded = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    tags: [],
  });
  const postRoute = new RegExp(`^/posts/${POST_ID}/\\?`);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
  fakeAdminEndpoint('GET', postRoute, () => ({ posts: [loaded] }));
  const expiredApi = fakeAdminEndpoint(
    'PUT',
    postRoute,
    { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] },
    { status: 401 },
  );

  return {
    expiredApi,
    // Declared after the expired fake, so they take over from it.
    restoreSaves: () => {
      fakeAdminEndpoint('POST', '/session/', () => 'Created', { status: 201 });
      return fakeAdminEndpoint('PUT', postRoute, ({ body }) => {
        const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
        return { posts: [{ ...loaded, ...submitted, updated_at: '2026-01-01T00:00:01.000Z' }] };
      });
    },
  };
}

async function appendToBody(text: string) {
  const body = editorScreen.body();
  // One input event: a fast autosave must not split a keyboard sequence into several saves.
  await body.fill(`${body.element().textContent ?? ''}${text}`);
}

/**
 * Counts every insertion of the leave dialog into the document. A locator
 * polls, so it cannot see a dialog that opens and closes inside one commit;
 * the observer fires on the DOM write itself and misses no frame.
 */
function watchLeaveDialog(): () => number {
  let insertions = 0;
  const carriesDialog = (node: Node): boolean =>
    node instanceof Element &&
    (node.matches(editorScreen.leaveDialogSelector) ||
      !!node.querySelector(editorScreen.leaveDialogSelector));
  const count = (records: MutationRecord[]) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (carriesDialog(node)) {
          insertions += 1;
        }
      }
    }
  };
  const observer = new MutationObserver(count);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    count(observer.takeRecords());
    observer.disconnect();
    return insertions;
  };
}

/** Opens the editor and leaves it with an edit the server has not seen. */
async function openDirtyEditor(options: RenderAdminAppOptions) {
  await renderAdminApp(`/editor/post/${POST_ID}`, options);
  await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
  await appendToBody(' and more');
  await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
  await expect.poll(unsavedChangesGuarded).toBe(true);
}

/** Opens the editor from a row of the React posts list, whose links are native hash anchors. */
async function openFromListRow(status: SavedPost['status'], options: RenderAdminAppOptions) {
  const listed = post({ id: POST_ID, title: 'Hello from React', status });
  fakePostsListScreen();
  // The list browses once per status bucket.
  fakePosts(({ filter }) => (filter?.includes(status) ? [listed] : []));
  await renderAdminApp('/posts', options);
  await postsListScreen.rowLink().first().click();
  await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
}

/** Records the hash of every `hashchange`, as a listener that routes on them hears them. */
function watchHashChanges(): () => string[] {
  const hashes: string[] = [];
  const record = (event: HashChangeEvent) => hashes.push(new URL(event.newURL).hash);
  window.addEventListener('hashchange', record);
  onTestFinished(() => window.removeEventListener('hashchange', record));
  return () => [...hashes];
}

/** Opens the editor with a hash change from a posts entry the router did not create. */
async function openByHashChange(path: string, options: RenderAdminAppOptions) {
  fakePostsListScreen();
  await renderAdminApp('/posts', options);
  window.history.replaceState(null, '');
  window.location.hash = path;
  await expect.element(editorScreen.body()).toBeVisible();
}

/**
 * No navigation out of the React post editor may lose what was typed. Every
 * blocked exit is put to the save engine: it finishes or saves outstanding
 * work and either lets the writer through or asks them to confirm.
 */
describe('Post editor leave guard', () => {
  it('saves a dirty draft on the way out and leaves without asking', async () => {
    const saveApi = fakeEditablePost();
    await openDirtyEditor(withoutAutosave(FLAG_ON));
    const dialogInsertions = watchLeaveDialog();

    await editorScreen.backLink('post').click();

    await expect.poll(currentRoute).toBe('/posts');
    // Not a single frame of it: the save on the way out is silent.
    expect(dialogInsertions()).toBe(0);
    expect(saveApi.requests.length).toBe(1);
    // Leaving is the writer's last checkpoint, so it earns a revision.
    expect(saveApi.lastRequest?.url ?? '').toContain('save_revision=true');
  });

  it('leaves a clean post silently and saves nothing', async () => {
    const saveApi = fakeEditablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withFastAutosave(FLAG_ON));
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

    await editorScreen.backLink('post').click();

    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.leaveDialog()).toHaveCount(0);
    expect(saveApi.requests.length).toBe(0);
  });

  it('asks before leaving a published post with unsaved changes, and stays on cancel', async () => {
    // A published post never autosaves, so its edits are still unsaved when
    // the writer leaves.
    const saveApi = fakeEditablePost({
      status: 'published',
      published_at: '2026-01-01T00:00:00.000Z',
    });
    await openDirtyEditor(withFastAutosave(FLAG_ON));

    await editorScreen.backLink('post').click();

    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    await editorScreen.stayInEditor().click();

    await expect(editorScreen.leaveDialog()).toHaveCount(0);
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
    expect(saveApi.requests.length).toBe(0);
  });

  it('leaves silently when the title only gained a trailing space', async () => {
    // Published, so a dirty title would have to ask rather than save on the way out.
    const saveApi = fakeEditablePost({
      status: 'published',
      published_at: '2026-01-01T00:00:00.000Z',
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, withFastAutosave(FLAG_ON));
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    const dialogInsertions = watchLeaveDialog();

    await editorScreen.titleInput().fill('Hello from React ');
    await editorScreen.backLink('post').click();

    await expect.poll(currentRoute).toBe('/posts');
    expect(dialogInsertions()).toBe(0);
    expect(saveApi.requests.length).toBe(0);
  });

  it.each([
    {
      name: 'router link',
      options: withFastAutosave(FLAG_ON),
      destination: '/posts',
      leave: () => editorScreen.backLink('post').click(),
    },
    {
      name: 'native hash link',
      options: FLAG_ON,
      destination: '/pro',
      leave: () => Promise.resolve(nativeHashAnchor().click()),
    },
  ])(
    'keeps the dialog open until leaving through a $name',
    async ({ options, destination, leave }) => {
      const saveApi = fakeEditablePost({
        status: 'published',
        published_at: '2026-01-01T00:00:00.000Z',
      });
      await openDirtyEditor(options);

      await leave();
      await expect.element(editorScreen.leaveDialog()).toBeVisible();
      const dialog = document.querySelector(editorScreen.leaveDialogSelector)!;
      let beganClosing = false;
      const recordState = () => {
        beganClosing ||= dialog.getAttribute('data-state') === 'closed';
      };
      const observer = new MutationObserver(recordState);
      observer.observe(dialog, { attributes: true, attributeFilter: ['data-state'] });
      try {
        await editorScreen.leaveEditor().click();

        await expect.poll(currentRoute).toBe(destination);
        await expect(editorScreen.root()).toHaveCount(0);
        // The dialog must unmount with the editor, without starting its close
        // animation and revealing the editor on the way to the destination.
        recordState();
        expect(beganClosing).toBe(false);
      } finally {
        observer.disconnect();
      }
      // Confirming discards the edit; nothing is written on the way out.
      expect(saveApi.requests.length).toBe(0);
    },
  );

  it('asks before leaving when the save on the way out fails', async () => {
    const saveApi = fakeEditablePost({}, { failSaves: true });
    await openDirtyEditor(withFastAutosave(FLAG_ON));
    await expect.element(editorScreen.saveErrorBanner()).toBeVisible();
    expect(saveApi.requests.length).toBeGreaterThanOrEqual(1);

    await editorScreen.backLink('post').click();

    // Nothing the engine can do persists the edit, so the writer decides.
    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);

    await editorScreen.stayInEditor().click();
    await expect(editorScreen.leaveDialog()).toHaveCount(0);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
  });

  it('asks before leaving when the save on the way out never answers', async () => {
    const { saveApi, resolveSave } = fakeDeferredSave();
    await openDirtyEditor(withoutAutosave(FLAG_ON));
    // Only the deadline's clock is faked; requests, rendering and polling stay on real time.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldClearNativeTimers: true });
    try {
      await editorScreen.backLink('post').click();
      await expect.poll(() => saveApi.requests.length).toBe(1);

      vi.advanceTimersByTime(LEAVE_DECISION_DEADLINE_MS);

      await expect.element(editorScreen.leaveDialog()).toBeVisible();
      vi.useRealTimers();
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
      await editorScreen.leaveEditor().click();
      await expect.poll(currentRoute).toBe('/posts');
      await expect(editorScreen.root()).toHaveCount(0);
    } finally {
      vi.useRealTimers();
      resolveSave();
    }
  });

  it('lets a sign-in that outlasts the deadline carry the writer out without asking', async () => {
    const { expiredApi, restoreSaves } = fakeExpiredSaves();
    await openDirtyEditor(withoutAutosave(FLAG_ON));
    const dialogInsertions = watchLeaveDialog();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldClearNativeTimers: true });
    try {
      await editorScreen.backLink('post').click();
      await expect.element(editorScreen.reauthDialog()).toBeVisible();
      expect(expiredApi.requests.length).toBe(1);

      vi.advanceTimersByTime(LEAVE_DECISION_DEADLINE_MS * 2);
    } finally {
      vi.useRealTimers();
    }
    const restoredApi = restoreSaves();
    await editorScreen.reauthPassword().fill('hunter22');
    await editorScreen.reauthSignIn().click();

    await expect.poll(currentRoute).toBe('/posts');
    expect(restoredApi.requests.length).toBe(1);
    expect(dialogInsertions()).toBe(0);
  });

  it('leaves for the first destination when a link is clicked during the save on the way out', async () => {
    const { saveApi, failSave } = fakeDeferredSave();
    await openDirtyEditor(withoutAutosave(FLAG_ON));
    const anchor = nativeHashAnchor();

    await editorScreen.backLink('post').click();
    await expect.poll(() => saveApi.requests.length).toBe(1);
    anchor.click();
    failSave();

    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    await editorScreen.leaveEditor().click();
    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('guards a native hash anchor out of the editor', async () => {
    const saveApi = fakeEditablePost({
      status: 'published',
      published_at: '2026-01-01T00:00:00.000Z',
    });
    await openDirtyEditor(withFastAutosave(FLAG_ON));
    const anchor = nativeHashAnchor();

    anchor.click();

    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    expect(saveApi.requests.length).toBe(0);

    // Cancelling drops the intercepted anchor, so the writer stays put and
    // the next click on the same link asks again rather than going through.
    await editorScreen.stayInEditor().click();
    await expect(editorScreen.leaveDialog()).toHaveCount(0);
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');

    anchor.click();
    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
  });

  it.each(['/editor/post', '/editor/post/'])(
    'replaces the URL of a post created at %s without asking to leave',
    async (newPostUrl) => {
      const { createApi, updateApi, resolveCreate } = fakeNewPost();

      await renderAdminApp(newPostUrl, withFastAutosave(FLAG_ON));
      await expect.element(editorScreen.body()).toBeVisible();

      await appendToBody('First words');
      await expect.poll(() => createApi.requests.length).toBe(1);
      // The URL swap lands on a post the writer has already moved past.
      await appendToBody(' and then some');
      resolveCreate();

      await expect.poll(currentRoute).toBe(`/editor/post/${NEW_POST_ID}`);
      await expect(editorScreen.leaveDialog()).toHaveCount(0);
      await expect.element(editorScreen.body()).toHaveTextContent('First words and then some');
      // Nothing treated the swap as a leave, so no revision was cut for it.
      expect(updateApi.requests.every((r) => !r.url.includes('save_revision=true'))).toBe(true);
    },
  );

  it('preserves a blocked exit when a create acquires its ID', async () => {
    const { createApi, resolveCreate } = fakeNewPost();

    await renderAdminApp('/editor/post', FLAG_ON);
    await expect.element(editorScreen.body()).toBeVisible();
    await appendToBody('First words');
    await expect.poll(() => createApi.requests.length).toBe(1);

    await editorScreen.backLink('post').click();
    expect(currentRoute()).toBe('/editor/post');

    // The create acknowledgement wants to replace the URL, but the writer's
    // already-blocked exit remains the destination that ultimately proceeds.
    resolveCreate();
    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.leaveDialog()).toHaveCount(0);
  });

  it('applies a deferred created-post URL after the writer cancels the exit', async () => {
    const { createApi, resolveCreate } = fakeNewPost({ failUpdates: true });

    await renderAdminApp('/editor/post', FLAG_ON);
    await expect.element(editorScreen.body()).toBeVisible();
    await appendToBody('First words');
    await expect.poll(() => createApi.requests.length).toBe(1);
    await appendToBody(' and then some');

    await editorScreen.backLink('post').click();
    resolveCreate();

    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    expect(currentRoute()).toBe('/editor/post');
    await editorScreen.stayInEditor().click();

    await expect.poll(currentRoute).toBe(`/editor/post/${NEW_POST_ID}`);
    await expect.element(editorScreen.body()).toHaveTextContent('First words and then some');
  });

  it('arms the browser unload prompt while unsaved work exists', async () => {
    const { saveApi, resolveSave } = fakeDeferredSave();
    await renderAdminApp(`/editor/post/${POST_ID}`, withFastAutosave(FLAG_ON));

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    expect(unsavedChangesGuarded()).toBe(false);

    await appendToBody(' and more');
    try {
      // Keep unsaved work observable even when the fast autosave has already started.
      await expect.poll(unsavedChangesGuarded).toBe(true);
      await expect.poll(() => saveApi.requests.length).toBe(1);
    } finally {
      resolveSave();
    }

    await expect.poll(unsavedChangesGuarded).toBe(false);
  });

  it('keeps the browser unload prompt armed for a clean write in flight', async () => {
    const { saveApi, resolveSave } = fakeDeferredSave();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    expect(unsavedChangesGuarded()).toBe(false);

    await userEvent.keyboard('{Meta>}s{/Meta}');
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.poll(unsavedChangesGuarded).toBe(true);

    resolveSave();
    await expect.poll(unsavedChangesGuarded).toBe(false);
  });
});

/**
 * Back, Forward and hash changes reach the app as history pops, usually from
 * entries the router did not create; they get the same leave decision.
 */
describe('Post editor leave guard on history pops', () => {
  it('saves a dirty draft before Back leaves, holding the editor URL until the save lands', async () => {
    const { saveApi, resolveSave } = fakeDeferredSave();
    await openByHashChange(`/editor/post/${POST_ID}`, withoutAutosave(FLAG_ON));
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    const dialogInsertions = watchLeaveDialog();

    window.history.back();

    await expect.poll(() => saveApi.requests.length).toBe(1);
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');

    resolveSave();

    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.root()).toHaveCount(0);
    expect(dialogInsertions()).toBe(0);
    expect(saveApi.lastRequest?.url ?? '').toContain('save_revision=true');
  });

  it('asks before Back leaves a published post opened from a list row, and stays on cancel', async () => {
    const saveApi = fakeEditablePost({ status: 'published', published_at: LOADED_AT });
    await openFromListRow('published', withFastAutosave(FLAG_ON));
    await appendToBody(' and more');
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    const hashChanges = watchHashChanges();

    window.history.back();

    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    await editorScreen.stayInEditor().click();
    await expect(editorScreen.leaveDialog()).toHaveCount(0);
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
    expect(hashChanges()).toEqual([]);

    window.history.back();

    await editorScreen.leaveEditor().click();
    await expect.poll(currentRoute).toBe('/posts');
    await expect.element(postsListScreen.rowLink().first()).toBeVisible();
    await expect.poll(hashChanges).toEqual(['#/posts']);
    // Confirming discards the staged edits; nothing is written on the way out.
    expect(saveApi.requests.length).toBe(0);
  });

  it('leaves a clean editor at once on Back', async () => {
    const saveApi = fakeEditablePost();
    await openFromListRow('draft', withFastAutosave(FLAG_ON));
    expect(unsavedChangesGuarded()).toBe(false);
    const dialogInsertions = watchLeaveDialog();

    window.history.back();

    await expect.poll(currentRoute).toBe('/posts');
    await expect.element(postsListScreen.rowLink().first()).toBeVisible();
    expect(dialogInsertions()).toBe(0);
    expect(saveApi.requests.length).toBe(0);
  });

  it('asks before Forward leaves a dirty editor', async () => {
    const saveApi = fakeEditablePost({ status: 'published', published_at: LOADED_AT });
    await openByHashChange(`/editor/post/${POST_ID}`, withFastAutosave(FLAG_ON));
    await editorScreen.backLink('post').click();
    await expect(editorScreen.root()).toHaveCount(0);
    window.history.back();
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');
    await expect.poll(unsavedChangesGuarded).toBe(true);

    window.history.forward();

    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    await editorScreen.leaveEditor().click();
    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.root()).toHaveCount(0);
    expect(saveApi.requests.length).toBe(0);
  });

  it('asks before a hash change made outside the router leaves the editor', async () => {
    const saveApi = fakeEditablePost({ status: 'published', published_at: LOADED_AT });
    await openDirtyEditor(withFastAutosave(FLAG_ON));

    window.location.hash = '/posts';

    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    await editorScreen.leaveEditor().click();
    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.root()).toHaveCount(0);
    expect(saveApi.requests.length).toBe(0);
  });

  it('shows the post in the URL when a hash change and Back move between two posts', async () => {
    fakeEditablePost();
    fakeAdminEndpoint('GET', new RegExp(`^/posts/${OTHER_POST_ID}/\\?`), {
      posts: [
        post({
          id: OTHER_POST_ID,
          title: 'Another post',
          status: 'draft',
          lexical: buildLexicalParagraph('Other words'),
          updated_at: LOADED_AT,
          published_at: null,
          tags: [],
        }),
      ],
    });
    await openByHashChange(`/editor/post/${POST_ID}`, withoutAutosave(FLAG_ON));
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');

    window.location.hash = `/editor/post/${OTHER_POST_ID}`;

    await expect.element(editorScreen.titleInput()).toHaveValue('Another post');
    await expect.element(editorScreen.body()).toHaveTextContent('Other words');

    window.history.back();

    await expect.poll(currentRoute).toBe(`/editor/post/${POST_ID}`);
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
  });

  it('keeps a created post’s editor and unsaved text when a hash change reaches its URL again', async () => {
    const { createApi, resolveCreate } = fakeNewPost();
    await openByHashChange('/editor/post', withoutAutosave(FLAG_ON));
    await appendToBody('First words');
    await expect.poll(() => createApi.requests.length).toBe(1);
    resolveCreate();
    await expect.poll(currentRoute).toBe(`/editor/post/${NEW_POST_ID}`);
    await appendToBody(' and then some');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    const editor = editorScreen.root().element();

    window.location.hash = `/editor/post/${NEW_POST_ID}/`;

    // Only the created post's own editor puts its URL back without the slash.
    await expect.poll(currentRoute).toBe(`/editor/post/${NEW_POST_ID}`);
    expect(editor.isConnected).toBe(true);
    await expect.element(editorScreen.body()).toHaveTextContent('First words and then some');
    await expect(editorScreen.leaveDialog()).toHaveCount(0);
  });

  it('opens a new post when a hash change reaches the new-post URL from a post created there', async () => {
    const { createApi, resolveCreate } = fakeNewPost();
    await openByHashChange('/editor/post', withoutAutosave(FLAG_ON));
    await appendToBody('First words');
    await expect.poll(() => createApi.requests.length).toBe(1);
    resolveCreate();
    await expect.poll(currentRoute).toBe(`/editor/post/${NEW_POST_ID}`);
    await expect.poll(unsavedChangesGuarded).toBe(false);

    window.location.hash = '/editor/post';

    await expect.element(editorScreen.wordCount()).toHaveTextContent('0 words');
    expect(currentRoute()).toBe('/editor/post');
  });

  it('keeps where Back leaves for when the hash is written during the save on the way out', async () => {
    const { saveApi, failSave } = fakeDeferredSave();
    await openByHashChange(`/editor/post/${POST_ID}`, withoutAutosave(FLAG_ON));
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');
    await expect.poll(unsavedChangesGuarded).toBe(true);

    window.history.back();
    await expect.poll(() => saveApi.requests.length).toBe(1);
    window.location.hash = '/pro';
    await expect.poll(currentRoute).toBe(`/editor/post/${POST_ID}`);
    failSave();

    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    await editorScreen.leaveEditor().click();
    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('keeps where Back leaves for when the editor URL is pushed again during the save on the way out', async () => {
    const { saveApi, failSave } = fakeDeferredSave();
    await openByHashChange(`/editor/post/${POST_ID}`, withoutAutosave(FLAG_ON));
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');
    await expect.poll(unsavedChangesGuarded).toBe(true);

    window.history.back();
    await expect.poll(() => saveApi.requests.length).toBe(1);
    window.location.hash = `/editor/post/${POST_ID}/`;
    failSave();

    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    await editorScreen.leaveEditor().click();
    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('keeps a held exit when the URL drops its trailing slash during the save on the way out', async () => {
    const { saveApi, failSave } = fakeDeferredSave();
    await renderAdminApp(`/editor/post/${POST_ID}/`, withoutAutosave(FLAG_ON));
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');
    await expect.poll(unsavedChangesGuarded).toBe(true);

    await editorScreen.backLink('post').click();
    await expect.poll(() => saveApi.requests.length).toBe(1);
    window.location.replace(`#/editor/post/${POST_ID}`);
    failSave();

    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    await editorScreen.leaveEditor().click();
    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('stays put when the URL only drops its trailing slash', async () => {
    const saveApi = fakeEditablePost({ status: 'published', published_at: LOADED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}/`, withFastAutosave(FLAG_ON));
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    const dialogInsertions = watchLeaveDialog();

    window.location.replace(`#/editor/post/${POST_ID}`);

    await expect.poll(currentRoute).toBe(`/editor/post/${POST_ID}`);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
    // A real exit afterwards is still held, and is the first to ask.
    window.history.back();
    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    expect(dialogInsertions()).toBe(1);
    await editorScreen.stayInEditor().click();
    await expect(editorScreen.leaveDialog()).toHaveCount(0);
    expect(saveApi.requests.length).toBe(0);
  });

  it('holds Back at a created post URL while the writer decides', async () => {
    const { createApi, resolveCreate } = fakeNewPost({ failUpdates: true });
    await openByHashChange('/editor/post', withoutAutosave(FLAG_ON));
    await appendToBody('First words');
    await expect.poll(() => createApi.requests.length).toBe(1);
    resolveCreate();
    await expect.poll(currentRoute).toBe(`/editor/post/${NEW_POST_ID}`);
    await appendToBody(' and then some');
    await expect.poll(unsavedChangesGuarded).toBe(true);

    window.history.back();

    // The save on the way out fails, so the writer decides.
    await expect.element(editorScreen.leaveDialog()).toBeVisible();
    expect(currentRoute()).toBe(`/editor/post/${NEW_POST_ID}`);
    await editorScreen.stayInEditor().click();
    await expect(editorScreen.leaveDialog()).toHaveCount(0);
    expect(currentRoute()).toBe(`/editor/post/${NEW_POST_ID}`);
    await expect.element(editorScreen.body()).toHaveTextContent('First words and then some');
  });
});
