import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
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

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const THEIR_SAVE_AT = '2026-01-01T09:00:00.000Z';

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

/**
 * A post another writer moves on mid-session: every update is refused with the
 * collision the server raises for a stale `updated_at`, and from that moment
 * the read serves their version instead.
 */
function fakeCollidingPost() {
  fakeSnippets([]);
  fakePosts([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));

  const mine = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    tags: [],
  });
  const theirs = {
    ...mine,
    title: 'Hello from someone else',
    lexical: buildLexicalParagraph('Their version of the body'),
    updated_at: THEIR_SAVE_AT,
  };
  let saves = 0;

  const readApi = fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), () => ({
    posts: [saves === 0 ? mine : theirs],
  }));

  const saveApi = fakeAdminEndpoint(
    'PUT',
    new RegExp(`^/posts/${POST_ID}/\\?`),
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
 * writer's version, or keep their own words before they do.
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
    'replaces the post with the server copy and saves against its version next',
    async () => {
      const { readApi, saveApi } = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await collide(saveApi);
      const readsBefore = readApi.requests.length;

      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();

      // The reload reads through the editor's own request options.
      await expect.poll(() => readApi.requests.length, POLL).toBe(readsBefore + 1);
      expect(readApi.lastRequest?.url ?? '').toContain('formats=mobiledoc%2Clexical');

      await expect
        .element(editorScreen.body(), POLL)
        .toHaveTextContent('Their version of the body');
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from someone else');
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
