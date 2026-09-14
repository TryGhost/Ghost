import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeMembers,
  fakeNewsletters,
  fakePosts,
  fakeSnippets,
  fakeUsers,
  post,
  renderAdminApp,
  staffRole,
  staffUser,
  unsavedChangesGuarded,
  type EndpointCapture,
  type StaffRoleName,
  type StaffUser,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { publishScreen } from '@/editor/publish/publish.screen';

const POST_ID = 'abc123';
const NEW_POST_ID = 'new123';
const OWNER_ID = '1';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);

// A settings save waits on the engine's queue, so these journeys outlast the default timeout.
const SLOW = 20_000;
const POLL = { timeout: 10_000 };
// Under the 3s autosave debounce, so only an undebounced field save can satisfy it.
const FIELD_POLL = { timeout: 2_000 };

type SavedPost = ReturnType<typeof post>;

const OWNER = { id: OWNER_ID, name: 'Owner User', email: 'owner@test.com' };
const NADIA = staffUser({ name: 'Nadia Ahmed', slug: 'nadia', email: 'nadia@test.com' });
const JOSE = staffUser({ name: 'José García', slug: 'jose', email: 'jose@test.com' });

const STAFF_RECORDS = new Map(
  [OWNER, NADIA, JOSE].map(
    (person) => [person.id, { id: person.id, name: person.name, email: person.email }] as const,
  ),
);

/** Ghost answers with the author relations filled in, not the identities it was sent. */
function hydrateAuthors(authors: unknown): unknown[] {
  return ((authors ?? []) as Array<{ id?: string }>).map(
    (author) => STAFF_RECORDS.get(author.id ?? '') ?? author,
  );
}

function submittedPost(capture: EndpointCapture): Record<string, unknown> {
  const body = capture.lastRequest?.body as { posts: Record<string, unknown>[] } | undefined;
  return body?.posts[0] ?? {};
}

function asRole(name: StaffRoleName) {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

function editorChrome(staff: StaffUser[] = [NADIA, JOSE]) {
  fakeSnippets([]);
  fakePosts([]);
  // The header's publish inputs read the site's member total and newsletter list.
  fakeMembers([]);
  fakeNewsletters([]);
  fakeUsers([...(currentUserResponse().users as unknown as StaffUser[]), ...staff]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

/** A post that answers saves the way Ghost does: submitted fields back, fresh token. */
function fakeSavablePost(overrides: Partial<SavedPost> = {}, staff?: StaffUser[]) {
  editorChrome(staff);
  let current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    authors: [OWNER],
    tags: [],
    ...overrides,
  });
  let saves = 0;

  fakeAdminEndpoint('GET', ROUTE, () => ({ posts: [current] }));

  return fakeAdminEndpoint('PUT', ROUTE, ({ body }) => {
    saves += 1;
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    current = {
      ...current,
      ...submitted,
      authors: hydrateAuthors(submitted.authors ?? current.authors),
      updated_at: `2026-01-01T00:00:0${saves}.000Z`,
    };
    return { posts: [current] };
  });
}

async function openAuthors() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await expect.element(editorScreen.settingsAuthors()).toBeVisible();
}

/** Opens the list, which is where the staff browse starts. */
async function openAuthorList() {
  await editorScreen.settingsAuthorsInput().click();
  await expect.element(editorScreen.settingsAuthorsList()).toBeVisible();
}

/**
 * The sidebar's Authors section: who the post is credited to, in order, picked
 * from the site's existing staff.
 */
describe('Post settings authors', () => {
  it(
    'reports a failed staff lookup and lets the writer retry without losing authors',
    async () => {
      const saveApi = fakeSavablePost();
      fakeAdminEndpoint(
        'GET',
        /^\/users\/\?/,
        { errors: [{ message: 'Authorization failed', type: 'UnauthorizedError' }] },
        { status: 401 },
      );
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAuthors();
      await editorScreen.settingsAuthorsInput().click();

      await expect.element(page.getByRole('alert')).toHaveTextContent('Couldn’t load authors.');
      expect(editorScreen.settingsAuthorNames()).toEqual(['Owner User']);
      expect(saveApi.requests).toHaveLength(0);

      // Once the session is restored, retry the lookup in the existing editor.
      fakeUsers([NADIA, JOSE]);
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect.element(editorScreen.settingsAuthorOption('Nadia Ahmed')).toBeVisible();
      await expect.element(editorScreen.settingsAuthorsInput()).toHaveFocus();
      await userEvent.keyboard('nadia{Enter}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi).authors).toEqual([{ id: OWNER_ID }, { id: NADIA.id }]);
    },
    SLOW,
  );

  it(
    'credits another author on a draft as soon as one is picked',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAuthors();

      expect(editorScreen.settingsAuthorNames()).toEqual(['Owner User']);

      await openAuthorList();
      await expect.element(editorScreen.settingsAuthorOption('Nadia Ahmed')).toBeVisible();
      // Someone already credited is not offered a second time.
      await expect(editorScreen.settingsAuthorOption('Owner User')).toHaveCount(0);
      await editorScreen.settingsAuthorOption('Nadia Ahmed').click();

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi).authors).toEqual([{ id: OWNER_ID }, { id: NADIA.id }]);
      await expect.poll(editorScreen.settingsAuthorNames).toEqual(['Owner User', 'Nadia Ahmed']);
    },
    SLOW,
  );

  it(
    'removes an author the writer no longer credits',
    async () => {
      const saveApi = fakeSavablePost({
        authors: [OWNER, { id: NADIA.id, name: NADIA.name, email: NADIA.email }],
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAuthors();

      expect(editorScreen.settingsAuthorNames()).toEqual(['Owner User', 'Nadia Ahmed']);

      await editorScreen.removeAuthor('Nadia Ahmed').click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi).authors).toEqual([{ id: OWNER_ID }]);
      await expect.poll(editorScreen.settingsAuthorNames).toEqual(['Owner User']);
    },
    SLOW,
  );

  it(
    'keeps naming the authors a removal left behind',
    async () => {
      const saveApi = fakeSavablePost({
        status: 'published',
        published_at: PUBLISHED_AT,
        authors: [OWNER, { id: NADIA.id, name: NADIA.name, email: NADIA.email }],
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAuthors();

      // The list is never opened, so the staff browse never answers.
      await editorScreen.removeAuthor('Owner User').click();

      await expect.poll(editorScreen.settingsAuthorNames).toEqual(['Nadia Ahmed']);
      await expect
        .element(editorScreen.removeAuthor('Nadia Ahmed'))
        .toHaveAttribute('aria-label', 'Remove Nadia Ahmed');

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi).authors).toEqual([{ id: NADIA.id }]);
      await expect.poll(editorScreen.settingsAuthorNames).toEqual(['Nadia Ahmed']);
    },
    SLOW,
  );

  it(
    'refuses to save a post nobody is credited with',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAuthors();

      await expect(editorScreen.settingsAuthorsError()).toHaveCount(0);

      await editorScreen.removeAuthor('Owner User').click();

      // Staged rather than saved: the field gate holds an empty list back.
      await expect.element(editorScreen.settingsAuthorsError()).toBeVisible();
      await expect
        .element(editorScreen.settingsAuthorsInput())
        .toHaveAttribute('aria-invalid', 'true');
      expect(saveApi.requests).toHaveLength(0);
      await expect.poll(unsavedChangesGuarded).toBe(true);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect
        .element(editorScreen.saveErrorBanner())
        .toHaveTextContent('At least one author is required.');
      expect(saveApi.requests).toHaveLength(0);

      // Crediting someone again recovers from the refusal.
      await openAuthorList();
      await editorScreen.settingsAuthorOption('Nadia Ahmed').click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi).authors).toEqual([{ id: NADIA.id }]);
      await expect(editorScreen.settingsAuthorsError()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'stages a published post’s authors until Update',
    async () => {
      const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAuthors();

      await expect.element(editorScreen.updateButton()).toBeDisabled();

      await openAuthorList();
      await editorScreen.settingsAuthorOption('Nadia Ahmed').click();

      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi).authors).toEqual([{ id: OWNER_ID }, { id: NADIA.id }]);
      await expect.element(editorScreen.updateButton()).toBeDisabled();
    },
    SLOW,
  );

  it(
    'searches the staff by name, credits the highlighted one with Tab and drops the last with Backspace',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAuthors();
      await openAuthorList();

      // An unaccented term still finds the accented name.
      await userEvent.keyboard('garcia');

      await expect(editorScreen.settingsAuthorOption('Nadia Ahmed')).toHaveCount(0);
      await expect.element(editorScreen.settingsAuthorOption('José García')).toBeVisible();

      await userEvent.keyboard('{Tab}');

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi).authors).toEqual([{ id: OWNER_ID }, { id: JOSE.id }]);

      await userEvent.keyboard('{Backspace}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
      expect(submittedPost(saveApi).authors).toEqual([{ id: OWNER_ID }]);
    },
    SLOW,
  );

  it(
    'keeps the keyboard on a row after picking one further down the list',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAuthors();
      await openAuthorList();

      // Nothing typed, so the pick is the second row rather than the first.
      await userEvent.keyboard('{ArrowDown}{Enter}');

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi).authors).toEqual([{ id: OWNER_ID }, { id: JOSE.id }]);

      // The list shrank under the highlight; Enter still takes what it points at.
      await expect
        .element(editorScreen.settingsAuthorsInput())
        .toHaveAttribute('aria-activedescendant');

      await userEvent.keyboard('{Enter}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
      expect(submittedPost(saveApi).authors).toEqual([
        { id: OWNER_ID },
        { id: JOSE.id },
        { id: NADIA.id },
      ]);
    },
    SLOW,
  );

  it(
    'closes the list when focus leaves the field',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAuthors();
      await openAuthorList();

      // Nothing typed, so Tab keeps its own job and moves focus on.
      await userEvent.keyboard('{Tab}');

      await expect(editorScreen.settingsAuthorsList()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'keeps the term on Escape and drops it on a click away',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAuthors();
      await openAuthorList();

      await userEvent.keyboard('nadia');
      await expect.element(editorScreen.settingsAuthorOption('Nadia Ahmed')).toBeVisible();

      await userEvent.keyboard('{Escape}');

      // The writer closed the list, not the search.
      await expect(editorScreen.settingsAuthorsList()).toHaveCount(0);
      await expect.element(editorScreen.settingsAuthorsInput()).toHaveValue('nadia');

      await openAuthorList();
      await editorScreen.status().click();

      await expect(editorScreen.settingsAuthorsList()).toHaveCount(0);
      await expect.element(editorScreen.settingsAuthorsInput()).toHaveValue('');
    },
    SLOW,
  );

  it(
    'credits a new post to the writer who started it',
    async () => {
      editorChrome();
      let created = post({ id: NEW_POST_ID, title: '(Untitled)', status: 'draft', tags: [] });
      const createApi = fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => {
        const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
        created = { ...created, ...submitted, id: NEW_POST_ID, updated_at: LOADED_AT };
        return { posts: [created] };
      });
      fakeAdminEndpoint('GET', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
        posts: [created],
      }));
      // The autosave that follows the create can land before the test ends.
      fakeAdminEndpoint('PUT', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
        posts: [created],
      }));

      await renderAdminApp('/editor/post', FLAG_ON);
      await openAuthors();

      expect(editorScreen.settingsAuthorNames()).toEqual(['Owner User']);
      await expect(editorScreen.settingsAuthorsError()).toHaveCount(0);

      await editorScreen.body().click();
      await userEvent.keyboard('{End}First words');

      await expect.poll(() => createApi.requests.length, POLL).toBe(1);
      expect(submittedPost(createApi).authors).toEqual([{ id: OWNER_ID }]);
    },
    SLOW,
  );

  it(
    'refuses a publish while nobody is credited',
    async () => {
      const saveApi = fakeSavablePost();
      // The publish machine reads the site's member total, which the boot entry
      // counts in a different shape.
      fakeAdminEndpoint('GET', /^\/members\/\?.*order=id/, {
        members: [],
        meta: { pagination: { page: 1, limit: 1, pages: 1, total: 20, next: null, prev: null } },
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAuthors();

      await editorScreen.removeAuthor('Owner User').click();
      await expect.element(editorScreen.settingsAuthorsError()).toBeVisible();

      await editorScreen.publishButton().click();
      await expect.element(publishScreen.options()).toBeVisible();
      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();

      await expect
        .element(publishScreen.confirmError())
        .toHaveTextContent('At least one author is required.');
      await expect(publishScreen.complete()).toHaveCount(0);
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'shows the section in the page editor too',
    async () => {
      editorChrome();
      fakeAdminEndpoint('GET', new RegExp(`^/pages/${POST_ID}/\\?`), () => ({
        pages: [
          post({
            id: POST_ID,
            title: 'Hello from React',
            slug: 'hello-from-react',
            status: 'draft',
            updated_at: LOADED_AT,
            published_at: null,
            authors: [OWNER],
            tags: [],
          }),
        ],
      }));
      await renderAdminApp(`/editor/page/${POST_ID}`, FLAG_ON);
      await openAuthors();

      expect(editorScreen.settingsAuthorNames()).toEqual(['Owner User']);
    },
    SLOW,
  );

  it.each(['Author', 'Contributor'] as StaffRoleName[])(
    'leaves Authors out for a %s',
    async (role) => {
      fakeSavablePost({ authors: [OWNER] });
      await renderAdminApp(`/editor/post/${POST_ID}`, asRole(role));
      await editorScreen.settingsToggle().click();
      await expect.element(editorScreen.settingsSidebar()).toBeVisible();

      await expect(editorScreen.settingsAuthors()).toHaveCount(0);
    },
    SLOW,
  );
});
