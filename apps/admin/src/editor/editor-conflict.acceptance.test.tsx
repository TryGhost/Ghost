import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  fakeAdminEndpoint,
  fakePosts,
  fakeSnippets,
  post,
  renderAdminApp,
  type CapturedEndpointRequest,
  type EndpointCapture,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const THEIR_SAVE_AT = '2026-01-01T09:00:00.000Z';
const AFTER_SAVE_AT = '2026-01-01T10:00:00.000Z';
const MY_IMAGE = 'https://example.com/content/images/mine.jpg';
const THEIR_IMAGE = 'https://example.com/content/images/theirs.jpg';
const READ_ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);

// The autosave debounce is 3s, so these journeys outlast the default timeout.
const SLOW = 20_000;
const POLL = { timeout: 10_000 };

// Captured before any test stubs it, so afterEach can put it back. Normally
// undefined: `clipboard` lives on the prototype, not as an own property.
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

function postIn(request: CapturedEndpointRequest | undefined): Record<string, unknown> {
  const body = request?.body as { posts: Record<string, unknown>[] } | undefined;
  return body?.posts[0] ?? {};
}

function featureImageSrc(): string | null {
  return editorScreen.featureImage().element().querySelector('img')?.getAttribute('src') ?? null;
}

function toastWithText(text: string | RegExp) {
  return page.getByText(text);
}

const mine = () =>
  post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    tags: [],
    feature_image: MY_IMAGE,
  });

const theirs = (overrides: Partial<ReturnType<typeof mine>> = {}) => ({
  ...mine(),
  title: 'Hello from someone else',
  lexical: buildLexicalParagraph('Their version of the body'),
  updated_at: THEIR_SAVE_AT,
  feature_image: THEIR_IMAGE,
  ...overrides,
});

/**
 * A post another writer moves on mid-session: every update is refused with the
 * collision the server raises for a stale `updated_at`, and from the first
 * refusal the read serves their version instead.
 */
function fakeCollidingPost() {
  fakeSnippets([]);
  fakePosts([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));

  let saves = 0;
  const readApi = fakeAdminEndpoint('GET', READ_ROUTE, () => ({
    posts: [saves === 0 ? mine() : theirs()],
  }));

  const saveApi = fakeAdminEndpoint(
    'PUT',
    READ_ROUTE,
    () => {
      saves += 1;
      return {
        errors: [
          {
            code: 'UPDATE_COLLISION',
            type: 'UpdateCollisionError',
            message: 'Saving failed! Someone else is editing this post.',
          },
        ],
      };
    },
    { status: 409 },
  );

  return { readApi, saveApi };
}

/**
 * A later handler for the same route wins, so the read's behaviour is changed
 * by declaring the next one mid-test rather than by a flag the fake reads.
 */
function readAnswers(status: number, body: object) {
  return fakeAdminEndpoint('GET', READ_ROUTE, body, { status });
}

const readFails = (status: number) =>
  readAnswers(status, { errors: [{ type: 'InternalServerError', message: 'Boom' }] });

const saveFails = (status: number) =>
  fakeAdminEndpoint(
    'PUT',
    READ_ROUTE,
    { errors: [{ type: 'NotFoundError', message: 'Post not found' }] },
    { status },
  );

async function typeIntoBody(text: string) {
  await editorScreen.body().click();
  await userEvent.keyboard(`{End}${text}`);
}

async function collide(saveApi: EndpointCapture) {
  await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
  await typeIntoBody(' and more');
  await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
  await expect.element(editorScreen.conflictBanner()).toBeVisible();
}

/**
 * What the writer can do once the server has refused their save: take the other
 * writer's version, or keep their own words before they do. A reload that fails
 * must leave all of that standing rather than replacing the screen.
 */
describe('Post editor update collision', () => {
  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it(
    'asks before a reload discards unsaved work, and cancelling keeps it',
    async () => {
      const { readApi, saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);
      const readsBefore = readApi.requests.length;

      await editorScreen.reloadAfterConflict().click();

      await expect.element(editorScreen.conflictReloadConfirm()).toBeVisible();
      await editorScreen.cancelConflictReload().click();

      await expect(editorScreen.conflictReloadConfirm()).toHaveCount(0);
      expect(readApi.requests.length).toBe(readsBefore);
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
      await expect.element(editorScreen.conflictBanner()).toBeVisible();
    },
    SLOW,
  );

  it(
    'reloads without asking when only the refused save makes the post dirty',
    async () => {
      const { readApi, saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await editorScreen.titleInput().fill('Renamed by me');
      await editorScreen.body().click();
      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      await expect.element(editorScreen.conflictBanner()).toBeVisible();

      // The writer puts the title back: nothing of theirs is left to discard,
      // even though the refused save still counts the post as dirty.
      await editorScreen.titleInput().fill('Hello from React');
      const readsBefore = readApi.requests.length;

      await editorScreen.reloadAfterConflict().click();

      await expect.poll(() => readApi.requests.length, POLL).toBe(readsBefore + 1);
      await expect(editorScreen.conflictReloadConfirm()).toHaveCount(0);
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from someone else');
    },
    SLOW,
  );

  it(
    'replaces the post with the server copy and saves against its version next',
    async () => {
      const { readApi, saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);
      const readsBefore = readApi.requests.length;
      expect(featureImageSrc()).toBe(MY_IMAGE);

      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();

      // The reload reads through the editor's own request options.
      await expect.poll(() => readApi.requests.length, POLL).toBe(readsBefore + 1);
      expect(readApi.lastRequest?.url ?? '').toContain('formats=mobiledoc%2Clexical');

      await expect
        .element(editorScreen.body(), POLL)
        .toHaveTextContent('Their version of the body');
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from someone else');
      await expect.poll(featureImageSrc, POLL).toBe(THEIR_IMAGE);
      await expect(editorScreen.conflictBanner()).toHaveCount(0);

      await typeIntoBody(' plus mine');
      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
      expect(postIn(saveApi.lastRequest)).toMatchObject({
        id: POST_ID,
        updated_at: THEIR_SAVE_AT,
      });
    },
    SLOW,
  );

  it(
    'keeps the accepted server copy in the editor query cache',
    async () => {
      const { readApi, saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);

      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from someone else');
      const readsAfterReload = readApi.requests.length;

      window.location.hash = '#/posts';
      await expect(editorScreen.titleInput()).toHaveCount(0);
      window.location.hash = `#/editor/post/${POST_ID}`;

      await expect.element(editorScreen.titleInput(), POLL).toHaveValue('Hello from someone else');
      expect(readApi.requests.length).toBe(readsAfterReload);
    },
    SLOW,
  );

  it(
    'keeps an older in-flight read from replacing the accepted cache',
    async () => {
      const { saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);

      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from someone else');

      const beforeLatest = theirs({
        title: 'Server copy before latest',
        updated_at: AFTER_SAVE_AT,
      });
      const pendingRead = deferred<{ posts: ReturnType<typeof theirs>[] }>();
      const staleRead = fakeAdminEndpoint('GET', READ_ROUTE, () => pendingRead.promise);
      const acceptedSave = fakeAdminEndpoint('PUT', READ_ROUTE, () => ({
        posts: [beforeLatest],
      }));

      await typeIntoBody(' accepted first');
      await userEvent.keyboard('{Meta>}s{/Meta}');
      await expect.poll(() => acceptedSave.requests.length, POLL).toBe(1);
      await expect.poll(() => staleRead.requests.length, POLL).toBe(1);

      const collisionSave = fakeAdminEndpoint(
        'PUT',
        READ_ROUTE,
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
      await typeIntoBody(' then conflicted');
      await userEvent.keyboard('{Meta>}s{/Meta}');
      await expect.poll(() => collisionSave.requests.length, POLL).toBe(1);
      await expect.element(editorScreen.conflictBanner()).toBeVisible();

      const latest = theirs({
        title: 'Latest server copy',
        updated_at: '2026-01-01T11:00:00.000Z',
      });
      readAnswers(200, { posts: [latest] });
      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();
      await expect.element(editorScreen.titleInput()).toHaveValue('Latest server copy');

      // The network work cannot be aborted by this fake, so let its older value
      // arrive after the accepted reload. React Query must ignore it.
      pendingRead.resolve({ posts: [beforeLatest] });
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });

      window.location.hash = '#/posts';
      await expect(editorScreen.titleInput()).toHaveCount(0);
      window.location.hash = `#/editor/post/${POST_ID}`;

      await expect.element(editorScreen.titleInput(), POLL).toHaveValue('Latest server copy');
    },
    SLOW,
  );

  it(
    'keeps the editor standing when the reload cannot read the post, and retries later',
    async () => {
      const { saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);

      const failedRead = readFails(500);
      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();

      await expect.poll(() => failedRead.requests.length, POLL).toBe(1);
      await expect.element(toastWithText('Couldn’t reload this post')).toBeVisible();
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
      await expect.element(editorScreen.conflictBanner()).toBeVisible();
      await expect(editorScreen.loadError()).toHaveCount(0);

      const servingRead = readAnswers(200, { posts: [theirs()] });
      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();

      await expect.poll(() => servingRead.requests.length, POLL).toBe(1);
      await expect
        .element(editorScreen.body(), POLL)
        .toHaveTextContent('Their version of the body');
      await expect(editorScreen.conflictBanner()).toHaveCount(0);
    },
    SLOW,
  );

  it.each<[string, () => Record<string, unknown>]>([
    ['has no collision token', () => ({ ...theirs(), updated_at: null })],
    ['has a malformed collision token', () => theirs({ updated_at: 'not-a-date' })],
    ['has the rejected collision token', () => theirs({ updated_at: LOADED_AT })],
    ['has an older collision token', () => theirs({ updated_at: '2025-12-31T23:59:59.000Z' })],
    ['belongs to another post', () => theirs({ id: 'someone-else' })],
  ])(
    'keeps local content when the reload response %s',
    async (_label, invalidRecordOf) => {
      const { saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);

      const invalidRead = readAnswers(200, { posts: [invalidRecordOf()] });
      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();

      await expect.poll(() => invalidRead.requests.length, POLL).toBe(1);
      await expect.element(toastWithText('Couldn’t reload this post')).toBeVisible();
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
      await expect.element(editorScreen.conflictBanner()).toBeVisible();
    },
    SLOW,
  );

  it(
    'keeps local content when a save starts before the reload answers',
    async () => {
      const { saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);

      const pendingRead = deferred<{ posts: ReturnType<typeof theirs>[] }>();
      const reloadRead = fakeAdminEndpoint('GET', READ_ROUTE, () => pendingRead.promise);
      const pendingSave = deferred<object>();
      const retrySave = fakeAdminEndpoint('PUT', READ_ROUTE, () => pendingSave.promise, {
        status: 409,
      });

      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();
      await expect.poll(() => reloadRead.requests.length, POLL).toBe(1);

      await userEvent.keyboard('{Meta>}s{/Meta}');
      await expect.poll(() => retrySave.requests.length, POLL).toBe(1);
      pendingRead.resolve({ posts: [theirs()] });

      await expect.element(toastWithText('Couldn’t reload this post')).toBeVisible();
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');

      pendingSave.resolve({
        errors: [
          {
            code: 'UPDATE_COLLISION',
            type: 'UpdateCollisionError',
            message: 'Saving failed! Someone else is editing this post.',
          },
        ],
      });
      await expect.element(editorScreen.conflictBanner()).toBeVisible();
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
    },
    SLOW,
  );

  it(
    'follows the status the other writer left the post in',
    async () => {
      const { saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);

      await expect.element(editorScreen.status()).toHaveTextContent('Draft');
      readAnswers(200, {
        posts: [theirs({ status: 'published', published_at: THEIR_SAVE_AT })],
      });

      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();

      // A stale chip would offer Draft for a post the next save publishes.
      await expect.element(editorScreen.status(), POLL).toHaveTextContent('Published');
    },
    SLOW,
  );

  it(
    'keeps the reloaded status when a later read answers with the copy it replaced',
    async () => {
      const { saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);

      readAnswers(200, {
        posts: [theirs({ status: 'published', published_at: THEIR_SAVE_AT })],
      });
      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();
      await expect.element(editorScreen.status(), POLL).toHaveTextContent('Published');

      // The save lands and invalidates the screen's query, whose refetch answers
      // with the draft the reload replaced. A read older than what the editor
      // holds must not roll the post back to it.
      const acceptedSave = fakeAdminEndpoint('PUT', READ_ROUTE, () => ({
        posts: [
          theirs({
            status: 'published',
            published_at: THEIR_SAVE_AT,
            updated_at: AFTER_SAVE_AT,
          }),
        ],
      }));
      const staleRead = readAnswers(200, { posts: [mine()] });

      await typeIntoBody(' plus mine');
      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => acceptedSave.requests.length, POLL).toBe(1);
      await expect.poll(() => staleRead.requests.length, POLL).toBeGreaterThan(0);
      await expect.element(editorScreen.status(), POLL).toHaveTextContent('Published');
    },
    SLOW,
  );

  it.each<[string, () => EndpointCapture]>([
    ['the read is a not-found', () => readFails(404)],
    ['the read comes back empty', () => readAnswers(200, { posts: [] })],
  ])(
    'says the post is gone rather than losing the content when %s',
    async (_label, missingReadOf) => {
      const copied = recordClipboard();
      const { saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);

      const missingRead = missingReadOf();
      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();

      await expect.poll(() => missingRead.requests.length, POLL).toBe(1);
      await expect
        .element(editorScreen.conflictBanner())
        .toHaveTextContent('This post has been deleted');
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
      await expect(editorScreen.notFound()).toHaveCount(0);

      // The way out of a deleted post is the copy, so it has to still be there.
      await editorScreen.copyConflictedContent().click();

      await expect.poll(() => copied.length, POLL).toBe(1);
      expect(copied[0]).toContain('Hello from React and more');

      const missingSave = saveFails(404);
      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => missingSave.requests.length, POLL).toBe(1);
      await expect
        .element(editorScreen.conflictBanner())
        .toHaveTextContent('This post has been deleted');
      await expect.element(editorScreen.copyConflictedContent()).toBeVisible();
    },
    SLOW,
  );

  it(
    'copies the unsaved title and body so the writer keeps their words',
    async () => {
      const copied = recordClipboard();
      const { saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);

      await editorScreen.copyConflictedContent().click();

      await expect.poll(() => copied.length, POLL).toBe(1);
      expect(copied[0]).toBe('Hello from React\n\nHello from React and more');
    },
    SLOW,
  );
});
