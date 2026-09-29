import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  post,
  renderAdminApp,
  submittedPost,
  unsavedChangesGuarded,
  withoutAutosave,
  type Post,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const FLAG_ON = withoutAutosave({ labs: { editorReact: true } });
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const MY_SAVE_AT = '2026-01-01T00:00:01.000Z';
const THEIR_SAVE_AT = '2026-01-01T00:00:02.000Z';
const READ_ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);

const UPDATE_COLLISION = {
  errors: [
    {
      code: 'UPDATE_COLLISION',
      type: 'UpdateCollisionError',
      message: 'Saving failed! Someone else is editing this post.',
    },
  ],
};

/**
 * A post two writers share: reads serve the stored copy, and a save carrying a stale
 * collision token is refused, as Core refuses one that changes a field.
 */
function fakeSharedPost(overrides: Partial<Post> = {}) {
  fakeEditorChrome();
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));

  let stored = post({
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
  const store = (changes: Partial<Post>) => {
    stored = {
      ...stored,
      ...changes,
      updated_at: new Date(Date.parse(stored.updated_at) + 1000).toISOString(),
    };
  };

  let readsHeld = Promise.resolve();
  let served = 0;
  const readApi = fakeAdminEndpoint('GET', READ_ROUTE, async () => {
    await readsHeld;
    served += 1;
    return { posts: [stored] };
  });
  const saveApi = fakeAdminEndpoint('PUT', READ_ROUTE, ({ body }) => {
    const submitted = (body as { posts: Partial<Post>[] }).posts[0];
    if (submitted.updated_at !== stored.updated_at) {
      return Response.json(UPDATE_COLLISION, { status: 409 });
    }
    store(submitted);
    return { posts: [stored] };
  });

  return {
    readApi,
    saveApi,
    stored: () => stored,
    /** Another writer's save, stored under a token this tab has never been sent. */
    theySave: (changes: Partial<Post>) => store(changes),
    /** Holds every read until the returned release is called. */
    holdReads: () => {
      const gate = deferred<void>();
      readsHeld = gate.promise;
      return () => gate.resolve();
    },
    /** Resolves once `count` reads have been answered and the editor has had them. */
    readsHandled: async (count: number) => {
      await expect.poll(() => served).toBe(count);
      // A refused read changes nothing on screen, so only time says it was handled.
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    },
  };
}

type SharedPost = ReturnType<typeof fakeSharedPost>;

async function appendToBody(text: string) {
  const body = editorScreen.body();
  await body.fill(`${body.element().textContent ?? ''}${text}`);
}

/** This tab's title save lands; the other writer's save lands before its refetch is read. */
async function saveThenTheySave(shared: SharedPost, save: () => Promise<void>) {
  await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
  const releaseReads = shared.holdReads();

  await editorScreen.titleInput().fill('My title');
  await save();
  await expect.poll(() => shared.saveApi.requests.length).toBe(1);
  await expect.poll(() => shared.readApi.requests.length).toBe(2);

  shared.theySave({
    title: 'Their title',
    lexical: buildLexicalParagraph('Their words'),
  });
  return releaseReads;
}

const saveShortcut = () => userEvent.keyboard('{Meta>}s{/Meta}');

/**
 * A background read can bring back another writer's version; the editor keeps its
 * own, so its next save collides with theirs instead of overwriting it.
 */
describe('Post editor refetch', () => {
  it('saves a draft against its own version after a refetch brings another writer’s', async () => {
    const shared = fakeSharedPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    const releaseReads = await saveThenTheySave(shared, saveShortcut);
    releaseReads();
    await shared.readsHandled(2);

    await appendToBody(' and mine');
    await saveShortcut();

    await expect.poll(() => shared.saveApi.requests.length).toBe(2);
    expect(submittedPost(shared.saveApi)).toMatchObject({ updated_at: MY_SAVE_AT });
    await expect
      .element(editorScreen.conflictBanner())
      .toHaveTextContent('Someone else is editing this post');
    await expect.element(editorScreen.titleInput()).toHaveValue('My title');
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and mine');
    expect(shared.stored()).toMatchObject({ title: 'Their title', updated_at: THEIR_SAVE_AT });
  });

  it('keeps a title staged on a published post through the refetch, and the Update collides', async () => {
    const shared = fakeSharedPost({
      status: 'published',
      published_at: '2025-12-01T00:00:00.000Z',
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    const releaseReads = await saveThenTheySave(shared, () => editorScreen.updateButton().click());
    await editorScreen.titleInput().fill('My staged title');
    releaseReads();
    await shared.readsHandled(2);

    await editorScreen.updateButton().click();

    await expect.poll(() => shared.saveApi.requests.length).toBe(2);
    expect(submittedPost(shared.saveApi)).toMatchObject({
      title: 'My staged title',
      updated_at: MY_SAVE_AT,
    });
    await expect.element(editorScreen.conflictBanner()).toBeVisible();
    await expect.element(editorScreen.titleInput()).toHaveValue('My staged title');
    expect(shared.stored()).toMatchObject({ title: 'Their title', updated_at: THEIR_SAVE_AT });
  });

  it('leaves a clean writer clean and unsaved when a refetch brings another writer’s version', async () => {
    const shared = fakeSharedPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    const releaseReads = await saveThenTheySave(shared, saveShortcut);
    await expect.element(editorScreen.status()).toHaveTextContent('Draft - Saved');
    releaseReads();
    await shared.readsHandled(2);

    await expect.element(editorScreen.status()).toHaveTextContent('Draft - Saved');
    expect(unsavedChangesGuarded()).toBe(false);
    await expect(editorScreen.conflictBanner()).toHaveCount(0);
    await expect.element(editorScreen.titleInput()).toHaveValue('My title');
    expect(shared.saveApi.requests).toHaveLength(1);
  });

  it('saves again without a conflict once the refetch of its own save has landed', async () => {
    const shared = fakeSharedPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');

    await editorScreen.titleInput().fill('My title');
    await saveShortcut();
    await expect.poll(() => shared.saveApi.requests.length).toBe(1);
    await shared.readsHandled(2);

    await appendToBody(' and more');
    await saveShortcut();

    await expect.poll(() => shared.saveApi.requests.length).toBe(2);
    expect(submittedPost(shared.saveApi)).toMatchObject({ updated_at: MY_SAVE_AT });
    await expect.element(editorScreen.status()).toHaveTextContent('Draft - Saved');
    await expect(editorScreen.conflictBanner()).toHaveCount(0);
    expect(shared.stored()).toMatchObject({ title: 'My title' });
    expect(shared.stored().lexical).toContain('Hello from React and more');
  });
});
