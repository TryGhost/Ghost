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
  tag,
  type EndpointCapture,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { OLD_SCHEMA_CORPUS } from '@/editor/engine/__fixtures__';

const POST_ID = 'abc123';
const NEW_POST_ID = 'new789';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const CREATED_AT = '2026-01-01T00:00:05.000Z';

// The autosave debounce is 3s, so these journeys outlast the default timeout.
const SLOW = 20_000;
const SAVE_POLL = { timeout: 10_000 };

type SavedPost = ReturnType<typeof post>;

function submittedPost(capture: EndpointCapture): Record<string, unknown> {
  const body = capture.lastRequest?.body as { posts: Record<string, unknown>[] };
  return body.posts[0];
}

function editorChrome() {
  fakeSnippets([]);
  fakePosts([]);
}

/**
 * A post that answers saves the way Ghost does: the response carries the
 * submitted fields back with a fresh collision token, and the read endpoint
 * serves whatever was saved last.
 */
function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
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

  const saveApi = fakeAdminEndpoint('PUT', new RegExp(`^/posts/${POST_ID}/\\?`), ({ body }) => {
    saves += 1;
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
    return { posts: [current] };
  });

  return saveApi;
}

async function typeIntoBody(text: string) {
  await editorScreen.body().click();
  await userEvent.keyboard(`{End}${text}`);
}

function bodyElement(): Element | null {
  return document.querySelector('[data-testid="editor-body"]');
}

/**
 * The React post editor's save engine wired to the API: body edits autosave,
 * a new post is created on its first edit, and a rejected save surfaces in
 * place instead of losing what was typed.
 */
describe('Post editor saving', () => {
  it(
    'autosaves the body and sends the write contract',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await typeIntoBody(' and more');

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      const url = saveApi.lastRequest?.url ?? '';
      expect(url).toContain('formats=mobiledoc%2Clexical');
      expect(url).toContain('include=tags%2Cauthors');
      // A background save never asks the server for a revision.
      expect(url).not.toContain('save_revision');

      expect(submittedPost(saveApi)).toMatchObject({
        id: POST_ID,
        title: 'Hello from React',
        slug: 'hello-from-react',
        status: 'draft',
        updated_at: LOADED_AT,
      });
      expect(String(submittedPost(saveApi).lexical)).toContain('Hello from React and more');
    },
    SLOW,
  );

  it(
    'stays clean once the save has been acknowledged and refetched',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await typeIntoBody(' and more');

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      await editorScreen.titleInput().click();
      await editorScreen.body().click();

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
    },
    SLOW,
  );

  it(
    'leaves an old-schema post alone until it is edited',
    async () => {
      const legacy = OLD_SCHEMA_CORPUS.find(({ name }) => name === 'legacy-text-nodes');
      const saveApi = fakeSavablePost({ lexical: JSON.stringify(legacy?.before) });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toBeVisible();
      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(0);

      await typeIntoBody(' edited');

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
    },
    SLOW,
  );

  it(
    'creates a new post on the first edit and swaps the URL without remounting',
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
      const createApi = fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => {
        const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
        created = { ...created, ...submitted, id: NEW_POST_ID, updated_at: CREATED_AT };
        return { posts: [created] };
      });
      fakeAdminEndpoint('GET', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
        posts: [created],
      }));
      fakeAdminEndpoint('PUT', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
        posts: [created],
      }));

      await renderAdminApp('/editor/post', FLAG_ON);
      await expect.element(editorScreen.body()).toBeVisible();
      const mountedBody = bodyElement();

      await typeIntoBody('First words');

      await expect.poll(() => createApi.requests.length, SAVE_POLL).toBe(1);
      expect(submittedPost(createApi)).toMatchObject({ title: '(Untitled)', slug: 'untitled' });
      expect(submittedPost(createApi).id).toBeUndefined();

      await expect.poll(currentRoute).toBe(`/editor/post/${NEW_POST_ID}`);
      expect(bodyElement()).toBe(mountedBody);
      await expect.element(editorScreen.body()).toHaveTextContent('First words');
    },
    SLOW,
  );

  it(
    'keeps typing that lands while the create is in flight and updates the new post',
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
      fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => {
        const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
        created = { ...created, ...submitted, id: NEW_POST_ID, updated_at: CREATED_AT };
        return { posts: [created] };
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
      await typeIntoBody(' and then some');

      await expect.poll(() => updateApi.requests.length, SAVE_POLL).toBe(1);
      // The update carries the id and the token the create handed back.
      expect(submittedPost(updateApi)).toMatchObject({
        id: NEW_POST_ID,
        updated_at: CREATED_AT,
      });
      expect(String(submittedPost(updateApi).lexical)).toContain('First words and then some');
      await expect.element(editorScreen.body()).toHaveTextContent('First words and then some');
    },
    SLOW,
  );

  it(
    'saves on Cmd-S and asks the server for a revision',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await typeIntoBody(' and more');
      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      expect(saveApi.lastRequest?.url ?? '').toContain('save_revision=true');
      expect(submittedPost(saveApi)).toMatchObject({
        id: POST_ID,
        title: 'Hello from React',
        slug: 'hello-from-react',
        status: 'draft',
        updated_at: LOADED_AT,
      });
      expect(String(submittedPost(saveApi).lexical)).toContain('Hello from React and more');
    },
    SLOW,
  );

  it(
    'lands a renamed draft clean, with the slug the server generated',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await editorScreen.titleInput().fill('Brand New Name');
      await editorScreen.body().click();

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        title: 'Brand New Name',
        slug: 'brand-new-name',
      });

      // Nothing is left diverged, so no further save is attempted.
      await editorScreen.titleInput().click();
      await editorScreen.body().click();
      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
    },
    SLOW,
  );

  it(
    'reports the save in the header and settles on saved',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.status()).toHaveTextContent('Draft - Saved');
      await typeIntoBody(' and more');

      await expect.element(editorScreen.status(), SAVE_POLL).toHaveTextContent('Saving');
      await expect.element(editorScreen.status(), SAVE_POLL).toHaveTextContent('Draft - Saved');
    },
    SLOW,
  );

  it(
    'leaves tags alone when it saves',
    async () => {
      const saveApi = fakeSavablePost({ tags: [tag({ id: 'tag1', name: 'News', slug: 'news' })] });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await typeIntoBody(' and more');

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      expect(submittedPost(saveApi)).not.toHaveProperty('tags');
    },
    SLOW,
  );

  it(
    'halts on a collision and keeps the content',
    async () => {
      editorChrome();
      fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
        posts: [
          post({
            id: POST_ID,
            title: 'Hello from React',
            slug: 'hello-from-react',
            status: 'draft',
            lexical: buildLexicalParagraph('Hello from React'),
            updated_at: LOADED_AT,
            tags: [],
          }),
        ],
      });
      const saveApi = fakeAdminEndpoint(
        'PUT',
        new RegExp(`^/posts/${POST_ID}/\\?`),
        {
          errors: [
            {
              code: 'UPDATE_COLLISION',
              type: 'UpdateCollisionError',
              message: 'Saving failed! Someone else is editing this post.',
            },
          ],
        },
        { status: 409 },
      );
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await typeIntoBody(' and more');

      await expect
        .element(editorScreen.conflictBanner())
        .toHaveTextContent('Someone else is editing this post');
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');

      await typeIntoBody(' again');

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      await expect.element(editorScreen.body()).toHaveTextContent('and more again');
    },
    SLOW,
  );

  it(
    'offers a retry in place when the session expired',
    async () => {
      editorChrome();
      fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
        posts: [
          post({
            id: POST_ID,
            title: 'Hello from React',
            slug: 'hello-from-react',
            status: 'draft',
            lexical: buildLexicalParagraph('Hello from React'),
            updated_at: LOADED_AT,
            tags: [],
          }),
        ],
      });
      const saveApi = fakeAdminEndpoint(
        'PUT',
        new RegExp(`^/posts/${POST_ID}/\\?`),
        { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] },
        { status: 401 },
      );
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await typeIntoBody(' and more');

      await expect.element(editorScreen.reauthBanner()).toHaveTextContent('Your session expired');
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);

      await editorScreen.retryReauth().click();

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(2);
    },
    SLOW,
  );

  it(
    'still says saving stopped after the session banner is dismissed',
    async () => {
      editorChrome();
      fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
        posts: [
          post({
            id: POST_ID,
            title: 'Hello from React',
            slug: 'hello-from-react',
            status: 'draft',
            lexical: buildLexicalParagraph('Hello from React'),
            updated_at: LOADED_AT,
            tags: [],
          }),
        ],
      });
      fakeAdminEndpoint(
        'PUT',
        new RegExp(`^/posts/${POST_ID}/\\?`),
        { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] },
        { status: 401 },
      );
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await typeIntoBody(' and more');

      await expect.element(editorScreen.reauthBanner()).toBeVisible();
      await editorScreen.dismissReauth().click();

      await expect.element(editorScreen.saveErrorBanner()).toHaveTextContent('session expired');
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
    },
    SLOW,
  );

  it(
    'does not leave the editor when the slug request finds no session',
    async () => {
      editorChrome();
      fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
        posts: [
          post({
            id: POST_ID,
            title: 'Hello from React',
            slug: 'hello-from-react',
            status: 'draft',
            lexical: buildLexicalParagraph('Hello from React'),
            updated_at: LOADED_AT,
            tags: [],
          }),
        ],
      });
      fakeAdminEndpoint(
        'GET',
        /^\/slugs\/post\//,
        { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] },
        { status: 401 },
      );
      const saveApi = fakeAdminEndpoint(
        'PUT',
        new RegExp(`^/posts/${POST_ID}/\\?`),
        { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] },
        { status: 401 },
      );
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await editorScreen.titleInput().fill('Brand New Name');
      await editorScreen.body().click();

      // The failing slug lookup must not navigate; the save that follows it
      // is what tells the writer the session is gone.
      await expect.element(editorScreen.reauthBanner()).toBeVisible();
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
      expect(saveApi.requests.length).toBeGreaterThan(0);
    },
    SLOW,
  );
});
