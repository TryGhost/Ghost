import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentRoute,
  fakeAdminEndpoint,
  fakePosts,
  fakeSnippets,
  post,
  renderAdminApp,
  unsavedChangesGuarded,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const NEW_POST_ID = 'new789';
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const CREATED_AT = '2026-01-01T00:00:05.000Z';
// The posts list is React-owned here so the back link is a router link and the
// blocker sees the navigation; the hash-anchor path has its own test below.
const FLAG_ON = { labs: { editorReact: true, postsListReact: true } };

// The autosave debounce is 3s, so these journeys outlast the default timeout.
const SLOW = 20_000;
const SAVE_POLL = { timeout: 10_000 };

type SavedPost = ReturnType<typeof post>;

function editorChrome() {
  fakeSnippets([]);
  fakePosts([]);
}

function fakeEditablePost(overrides: Partial<SavedPost> = {}, { failSaves = false } = {}) {
  editorChrome();
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

async function typeIntoBody(text: string) {
  await editorScreen.body().click();
  await userEvent.keyboard(`{End}${text}`);
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
async function openDirtyEditor(labs: RenderAdminAppOptions = FLAG_ON) {
  await renderAdminApp(`/editor/post/${POST_ID}`, labs);
  await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
  await typeIntoBody(' and more');
  await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
  await expect.poll(unsavedChangesGuarded).toBe(true);
}

/**
 * No navigation out of the React post editor may lose what was typed. Every
 * blocked exit is put to the save engine: it finishes or saves outstanding
 * work and either lets the writer through or asks them to confirm.
 */
describe('Post editor leave guard', () => {
  it(
    'saves a dirty draft on the way out and leaves without asking',
    async () => {
      const saveApi = fakeEditablePost();
      await openDirtyEditor();
      const dialogInsertions = watchLeaveDialog();

      await editorScreen.backLink('post').click();

      await expect.poll(currentRoute, SAVE_POLL).toBe('/posts');
      // Not a single frame of it: the save on the way out is silent, and a
      // prompt that flashes as the navigation lands is worse than none.
      expect(dialogInsertions()).toBe(0);
      expect(saveApi.requests.length).toBe(1);
      // Leaving is the writer's last checkpoint, so it earns a revision.
      expect(saveApi.lastRequest?.url ?? '').toContain('save_revision=true');
    },
    SLOW,
  );

  it(
    'leaves a clean post silently and saves nothing',
    async () => {
      const saveApi = fakeEditablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

      await editorScreen.backLink('post').click();

      await expect.poll(currentRoute, SAVE_POLL).toBe('/posts');
      await expect(editorScreen.leaveDialog()).toHaveCount(0);
      expect(saveApi.requests.length).toBe(0);
    },
    SLOW,
  );

  it(
    'asks before leaving a published post with unsaved changes, and stays on cancel',
    async () => {
      // A published post never autosaves, so its edits are still unsaved when
      // the writer leaves.
      const saveApi = fakeEditablePost({
        status: 'published',
        published_at: '2026-01-01T00:00:00.000Z',
      });
      await openDirtyEditor();

      await editorScreen.backLink('post').click();

      await expect.element(editorScreen.leaveDialog()).toBeVisible();
      await editorScreen.stayInEditor().click();

      await expect(editorScreen.leaveDialog()).toHaveCount(0);
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
      expect(saveApi.requests.length).toBe(0);
    },
    SLOW,
  );

  it(
    'leaves a published post with unsaved changes once the writer confirms',
    async () => {
      const saveApi = fakeEditablePost({
        status: 'published',
        published_at: '2026-01-01T00:00:00.000Z',
      });
      await openDirtyEditor();

      await editorScreen.backLink('post').click();
      await expect.element(editorScreen.leaveDialog()).toBeVisible();
      await editorScreen.leaveEditor().click();

      await expect.poll(currentRoute, SAVE_POLL).toBe('/posts');
      // Confirming discards the edit; nothing is written on the way out.
      expect(saveApi.requests.length).toBe(0);
    },
    SLOW,
  );

  it(
    'asks before leaving when the save on the way out fails',
    async () => {
      const saveApi = fakeEditablePost({}, { failSaves: true });
      await openDirtyEditor();
      await expect.element(editorScreen.saveErrorBanner(), SAVE_POLL).toBeVisible();
      expect(saveApi.requests.length).toBeGreaterThanOrEqual(1);

      await editorScreen.backLink('post').click();

      // Nothing the engine can do persists the edit, so the writer decides.
      await expect.element(editorScreen.leaveDialog(), SAVE_POLL).toBeVisible();
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);

      await editorScreen.stayInEditor().click();
      await expect(editorScreen.leaveDialog()).toHaveCount(0);
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
    },
    SLOW,
  );

  it(
    'guards a native hash anchor out of the editor',
    async () => {
      // With the posts list served by Ember the back link is a raw `#/posts`
      // anchor, which reaches the router as a POP it cannot block.
      const saveApi = fakeEditablePost({
        status: 'published',
        published_at: '2026-01-01T00:00:00.000Z',
      });
      await openDirtyEditor({ labs: { editorReact: true } });

      await editorScreen.backLink('post').click();

      await expect.element(editorScreen.leaveDialog()).toBeVisible();
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
      expect(saveApi.requests.length).toBe(0);

      // Cancelling drops the intercepted anchor, so the writer stays put and
      // the next click on the same link asks again rather than going through.
      await editorScreen.stayInEditor().click();
      await expect(editorScreen.leaveDialog()).toHaveCount(0);
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');

      await editorScreen.backLink('post').click();
      await expect.element(editorScreen.leaveDialog()).toBeVisible();
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    },
    SLOW,
  );

  it(
    'replaces the URL of a created post without asking to leave',
    async () => {
      editorChrome();
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
      fakeAdminEndpoint('GET', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
        posts: [created],
      }));
      const updateApi = fakeAdminEndpoint(
        'PUT',
        new RegExp(`^/posts/${NEW_POST_ID}/\\?`),
        ({ body }) => {
          const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
          created = { ...created, ...submitted, updated_at: '2026-01-01T00:00:09.000Z' };
          return { posts: [created] };
        },
      );

      await renderAdminApp('/editor/post', FLAG_ON);
      await expect.element(editorScreen.body()).toBeVisible();

      await typeIntoBody('First words');
      await expect.poll(() => createApi.requests.length, SAVE_POLL).toBe(1);
      // The URL swap lands on a post the writer has already moved past.
      await typeIntoBody(' and then some');
      createResponse.resolve({ posts: [created] });

      await expect.poll(currentRoute, SAVE_POLL).toBe(`/editor/post/${NEW_POST_ID}`);
      await expect(editorScreen.leaveDialog()).toHaveCount(0);
      await expect.element(editorScreen.body()).toHaveTextContent('First words and then some');
      // Nothing treated the swap as a leave, so no revision was cut for it.
      expect(updateApi.requests.every((r) => !r.url.includes('save_revision=true'))).toBe(true);
    },
    SLOW,
  );

  it(
    'arms the browser unload prompt only while the post is dirty',
    async () => {
      fakeEditablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      expect(unsavedChangesGuarded()).toBe(false);

      await typeIntoBody(' and more');
      await expect.poll(unsavedChangesGuarded).toBe(true);

      await expect.poll(unsavedChangesGuarded, SAVE_POLL).toBe(false);
    },
    SLOW,
  );
});
