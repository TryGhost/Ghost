import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeMembers,
  fakeNewsletters,
  fakePosts,
  fakePostsListScreen,
  fakeSnippets,
  post,
  renderAdminApp,
  staffRole,
  unsavedChangesGuarded,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { postsListScreen } from '@/posts/list/posts-list.screen';

const POST_ID = 'abc123';
const NEW_POST_ID = 'new123';
const LOADED_AT = '2026-01-01T00:00:00.000Z';
// The lists are React-owned so the delete's navigation stays in the router.
const FLAG_ON = { labs: { editorReact: true, postsListReact: true } };

// A delete waits on the engine's queue for the way out, so these outlast the default timeout.
const SLOW = 20_000;
const POLL = { timeout: 10_000 };

type SavedPost = ReturnType<typeof post>;

function asContributor() {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: 'Contributor' })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

function editorChrome() {
  fakeSnippets([]);
  fakePosts([]);
  // The header's publish inputs read the site's member total and newsletter list.
  fakeMembers([]);
  fakeNewsletters([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

/**
 * A savable post plus the API calls it can receive, in the order they arrive:
 * only the ordering shows that nothing was written after the delete.
 */
function fakeDeletablePost(overrides: Partial<SavedPost> = {}) {
  editorChrome();
  const calls: string[] = [];
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
  const route = new RegExp(`^/posts/${POST_ID}/\\?`);

  fakeAdminEndpoint('GET', route, () => ({ posts: [current] }));
  const saveApi = fakeAdminEndpoint('PUT', route, ({ body }) => {
    calls.push('PUT');
    saves += 1;
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
    return { posts: [current] };
  });
  const deleteApi = fakeAdminEndpoint(
    'DELETE',
    `/posts/${POST_ID}/`,
    () => {
      calls.push('DELETE');
      return null;
    },
    { status: 204 },
  );

  return { calls, deleteApi, saveApi };
}

/**
 * A delete the API refuses. `message` is the generic summary the serializer
 * rewrites every error to; `context` carries the sentence that explains it.
 */
function fakeRefusedDelete({
  message,
  context,
  status = 403,
}: {
  message: string;
  context: string;
  status?: number;
}) {
  editorChrome();
  const current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    tags: [],
  });
  const route = new RegExp(`^/posts/${POST_ID}/\\?`);

  fakeAdminEndpoint('GET', route, () => ({ posts: [current] }));
  fakeAdminEndpoint('PUT', route, () => ({ posts: [current] }));
  return fakeAdminEndpoint(
    'DELETE',
    `/posts/${POST_ID}/`,
    { errors: [{ type: 'NoPermissionError', message, context }] },
    { status },
  );
}

async function openSidebar() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
}

async function openDeleteDialog() {
  await openSidebar();
  await editorScreen.settingsDelete().click();
  await expect.element(editorScreen.settingsDeleteDialog()).toBeVisible();
}

async function typeIntoBody(text: string) {
  await editorScreen.body().click();
  await userEvent.keyboard(`{End}${text}`);
}

/**
 * The sidebar's Delete section: the one thing in the panel that goes straight
 * to the API, and the only exit from the editor that leaves no post behind.
 */
describe('Post settings delete', () => {
  it(
    'offers nothing to delete until the post exists',
    async () => {
      editorChrome();
      let created = post({
        id: NEW_POST_ID,
        title: '(Untitled)',
        slug: 'untitled',
        status: 'draft',
        updated_at: LOADED_AT,
        published_at: null,
        tags: [],
      });
      fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => {
        const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
        created = { ...created, ...submitted, id: NEW_POST_ID, updated_at: LOADED_AT };
        return { posts: [created] };
      });
      fakeAdminEndpoint('GET', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
        posts: [created],
      }));
      fakeAdminEndpoint('PUT', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
        posts: [created],
      }));

      await renderAdminApp('/editor/post', FLAG_ON);
      await openSidebar();

      await expect(editorScreen.settingsDelete()).toHaveCount(0);

      await typeIntoBody('First words');

      // The create gives the post an ID, which is all the button was waiting for.
      await expect.element(editorScreen.settingsDelete(), POLL).toBeVisible();
    },
    SLOW,
  );

  it(
    'names the post it is about to delete and warns that it is permanent',
    async () => {
      fakeDeletablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await expect.element(editorScreen.settingsDelete()).toHaveTextContent('Delete post');

      await editorScreen.settingsDelete().click();

      const dialog = editorScreen.settingsDeleteDialog();
      await expect.element(dialog).toHaveTextContent('Are you sure you want to delete this post?');
      await expect
        .element(dialog)
        .toHaveTextContent(
          'You’re about to delete "Hello from React". This is permanent! We warned you, k?',
        );
      await expect.element(editorScreen.confirmSettingsDelete()).toBeVisible();
      await expect.element(editorScreen.cancelSettingsDelete()).toBeVisible();

      // Focus follows the dialog rather than staying on the button behind the
      // overlay, so the keyboard reaches the choice it is asking for.
      await expect
        .poll(() => editorScreen.settingsDeleteDialog().element().contains(document.activeElement))
        .toBe(true);
      await expect.element(editorScreen.cancelSettingsDelete()).toHaveFocus();
    },
    SLOW,
  );

  it(
    'keeps the post when the writer cancels',
    async () => {
      const { deleteApi } = fakeDeletablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openDeleteDialog();

      await editorScreen.cancelSettingsDelete().click();

      await expect(editorScreen.settingsDeleteDialog()).toHaveCount(0);
      await expect.element(editorScreen.settingsDelete()).toHaveFocus();
      expect(deleteApi.requests.length).toBe(0);
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    },
    SLOW,
  );

  it(
    'deletes a dirty draft and leaves for the list without saving it on the way out',
    async () => {
      const { calls, deleteApi } = fakeDeletablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await openSidebar();
      // Unsaved work is what the leave guard would otherwise save on the way out.
      await typeIntoBody(' and more');

      await editorScreen.settingsDelete().click();
      await editorScreen.confirmSettingsDelete().click();

      await expect.poll(() => deleteApi.requests.length, POLL).toBe(1);
      await expect.poll(currentRoute, POLL).toBe('/posts');
      // Nothing may be written to a post that is gone, dirty body or not.
      expect(calls.slice(calls.indexOf('DELETE'))).toEqual(['DELETE']);
      await expect(editorScreen.leaveDialog()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'keeps the editor and shows why when the API refuses',
    async () => {
      fakeRefusedDelete({
        message: 'Cannot delete post.',
        context: 'You do not have permission to delete this post.',
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openDeleteDialog();

      await editorScreen.confirmSettingsDelete().click();

      // The sentence that explains the refusal, not the serializer's summary.
      await expect
        .element(editorScreen.settingsDeleteError(), POLL)
        .toHaveTextContent('You do not have permission to delete this post.');
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
      await expect.element(editorScreen.settingsDeleteDialog()).toBeVisible();

      await editorScreen.cancelSettingsDelete().click();

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    },
    SLOW,
  );

  it(
    'keeps unsaved work editable when the delete is refused by an expired session',
    async () => {
      const { saveApi } = fakeDeletablePost();
      fakeAdminEndpoint(
        'DELETE',
        `/posts/${POST_ID}/`,
        { errors: [{ type: 'UnauthorizedError', message: 'Please sign in again.' }] },
        { status: 401 },
      );
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await typeIntoBody(' and more');
      await expect.poll(unsavedChangesGuarded).toBe(true);
      await openDeleteDialog();
      await editorScreen.confirmSettingsDelete().click();

      await expect
        .element(editorScreen.settingsDeleteError())
        .toHaveTextContent(
          'Your session expired. Sign in again in a new tab, then try deleting again.',
        );
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
      await editorScreen.cancelSettingsDelete().click();
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');

      await typeIntoBody(' after refusal');
      await userEvent.keyboard('{Meta>}s{/Meta}');
      await expect
        .poll(() => JSON.stringify(saveApi.lastRequest?.body), POLL)
        .toContain('after refusal');
    },
    SLOW,
  );

  it(
    'leaves for a list that no longer carries the deleted post',
    async () => {
      const { deleteApi } = fakeDeletablePost();
      fakePostsListScreen();
      const row = post({ id: POST_ID, title: 'Hello from React', status: 'draft' });
      // The list the delete returns to, which stops serving the post once it is gone.
      const listApi = fakePosts(() => (deleteApi.requests.length ? [] : [row]));

      await renderAdminApp('/posts', FLAG_ON);
      await expect
        .element(postsListScreen.listItems().first())
        .toHaveTextContent('Hello from React');
      const browsesBefore = listApi.requests.length;

      await postsListScreen.rowLink().first().click();
      await expect.element(editorScreen.body(), POLL).toHaveTextContent('Hello from React');
      await openSidebar();
      await editorScreen.settingsDelete().click();
      await editorScreen.confirmSettingsDelete().click();

      await expect.poll(currentRoute, POLL).toBe('/posts');
      // Without the delete invalidating it, the list is served from the cache it
      // was left with — within the five-minute staleTime, deleted row and all.
      await expect.poll(() => listApi.requests.length, POLL).toBeGreaterThan(browsesBefore);
      await expect.poll(() => postsListScreen.listItems().elements().length, POLL).toBe(0);
    },
    SLOW,
  );

  it(
    'offers the delete to a Contributor on their own draft',
    async () => {
      const { deleteApi } = fakeDeletablePost({ authors: [{ id: '1' }] });
      await renderAdminApp(`/editor/post/${POST_ID}`, asContributor());
      await openSidebar();

      // The Access section is not theirs to see, but the delete is.
      await expect(editorScreen.settingsVisibility()).toHaveCount(0);
      await editorScreen.settingsDelete().click();
      await editorScreen.confirmSettingsDelete().click();

      await expect.poll(() => deleteApi.requests.length, POLL).toBe(1);
      await expect.poll(currentRoute, POLL).toBe('/posts');
    },
    SLOW,
  );

  it(
    'deletes a page through the pages API and returns to the pages list',
    async () => {
      editorChrome();
      const current = post({
        id: POST_ID,
        title: 'A page',
        slug: 'a-page',
        status: 'draft',
        lexical: buildLexicalParagraph('A page'),
        updated_at: LOADED_AT,
        published_at: null,
        tags: [],
      });
      fakeAdminEndpoint('GET', new RegExp(`^/pages/${POST_ID}/\\?`), () => ({ pages: [current] }));
      fakeAdminEndpoint('PUT', new RegExp(`^/pages/${POST_ID}/\\?`), () => ({ pages: [current] }));
      const deleteApi = fakeAdminEndpoint('DELETE', `/pages/${POST_ID}/`, null, { status: 204 });

      await renderAdminApp(`/editor/page/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await expect.element(editorScreen.settingsDelete()).toHaveTextContent('Delete page');

      await editorScreen.settingsDelete().click();
      await expect
        .element(editorScreen.settingsDeleteDialog())
        .toHaveTextContent('Are you sure you want to delete this page?');
      await editorScreen.confirmSettingsDelete().click();

      await expect.poll(() => deleteApi.requests.length, POLL).toBe(1);
      await expect.poll(currentRoute, POLL).toBe('/pages');
    },
    SLOW,
  );
});
