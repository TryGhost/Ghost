import { describe, expect, it, onTestFinished } from 'vitest';
import { userEvent } from 'vitest/browser';
import { postsDataType } from '@tryghost/admin-x-framework/api/posts';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentRoute,
  currentUserResponse,
  editorReadLanded,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakePostsListScreen,
  post,
  renderAdminApp,
  staffRole,
  submittedPost,
  unsavedChangesGuarded,
  withoutAutosave,
  type Post,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const FLAG_ON = withoutAutosave({ labs: { editorReact: true } });
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const MY_SAVE_AT = '2026-01-01T00:00:01.000Z';
const THEIR_SAVE_AT = '2026-01-01T00:00:02.000Z';
const READ_ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);
const CURRENT_USER_ID = String(currentUserResponse().users[0].id);
const MOBILEDOC =
  '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Legacy"]]]]}';

const UPDATE_COLLISION = {
  errors: [
    {
      code: 'UPDATE_COLLISION',
      type: 'UpdateCollisionError',
      message: 'Saving failed! Someone else is editing this post.',
    },
  ],
};

// Core's refusal of a write the role no longer allows, checked before the collision token.
const NO_PERMISSION = {
  errors: [
    {
      type: 'NoPermissionError',
      message: 'Permission error, cannot edit post.',
      context: 'You do not have permission to perform this action',
    },
  ],
};

type Role = 'Author' | 'Contributor';

function bootAs(role: Role): RenderAdminAppOptions {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: role })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

/** Core's rule for these roles: only posts they author, and for a Contributor only drafts. */
function mayEdit(role: Role, stored: Post): boolean {
  const authorIds = (stored.authors as Array<{ id: string }> | undefined)?.map(({ id }) => id);
  return !!authorIds?.includes(CURRENT_USER_ID) && (role === 'Author' || stored.status === 'draft');
}

/**
 * A post two writers share: reads serve the stored copy and a save on a stale token is refused.
 * Core is laxer: it refuses one only when a posts-row column or its tags, authors or tiers change.
 */
function fakeSharedPost(
  overrides: Partial<Post> = {},
  { canSave = () => true }: { canSave?: (stored: Post) => boolean } = {},
) {
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
  const readApi = fakeAdminEndpoint('GET', READ_ROUTE, async () => {
    await readsHeld;
    return { posts: [stored] };
  });
  const saveApi = fakeAdminEndpoint('PUT', READ_ROUTE, ({ body }) => {
    const submitted = (body as { posts: Partial<Post>[] }).posts[0];
    if (!canSave(stored)) {
      return Response.json(NO_PERMISSION, { status: 403 });
    }
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
    /** Another writer's save of fields Core stores beside the post, which leaves the token. */
    theySaveBeside: (changes: Partial<Post>) => {
      stored = { ...stored, ...changes };
    },
    /** Holds every read until the returned release is called, or the test finishes. */
    holdReads: () => {
      const gate = deferred<void>();
      readsHeld = gate.promise;
      const release = () => gate.resolve();
      // A spec that fails before releasing must not leave its reads in flight for the next.
      onTestFinished(release);
      return release;
    },
  };
}

type SharedPost = ReturnType<typeof fakeSharedPost>;

async function appendToBody(text: string) {
  const body = editorScreen.body();
  await expect.element(body).toBeVisible();
  await body.fill(`${body.element().textContent ?? ''}${text}`);
  await expect.poll(unsavedChangesGuarded).toBe(true);
}

/** This tab's title save lands; the other writer's save lands before its refetch is read. */
async function saveThenTheySave(
  shared: SharedPost,
  save: () => Promise<void>,
  theirChanges: Partial<Post> = {
    title: 'Their title',
    lexical: buildLexicalParagraph('Their words'),
  },
) {
  await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
  const releaseReads = shared.holdReads();

  await editorScreen.titleInput().fill('My title');
  await expect.poll(unsavedChangesGuarded).toBe(true);
  await save();
  await expect.poll(() => shared.saveApi.requests.length).toBe(1);
  await expect.poll(() => shared.readApi.requests.length).toBe(2);

  shared.theySave(theirChanges);
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
    const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    const releaseReads = await saveThenTheySave(shared, saveShortcut);
    releaseReads();
    await editorReadLanded(queryClient, shared.stored());

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
    const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    const releaseReads = await saveThenTheySave(shared, () => editorScreen.updateButton().click());
    await editorScreen.titleInput().fill('My staged title');
    releaseReads();
    await editorReadLanded(queryClient, shared.stored());

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
    const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    const releaseReads = await saveThenTheySave(shared, saveShortcut);
    // The guard clears when the save is acknowledged; the status holds "Saving…" for 3s.
    await expect.poll(unsavedChangesGuarded).toBe(false);
    releaseReads();
    await editorReadLanded(queryClient, shared.stored());

    await expect.poll(unsavedChangesGuarded).toBe(false);
    await expect(editorScreen.conflictBanner()).toHaveCount(0);
    await expect.element(editorScreen.titleInput()).toHaveValue('My title');
    expect(shared.saveApi.requests).toHaveLength(1);
  });

  it('saves again without a conflict once the refetch of its own save has landed', async () => {
    const shared = fakeSharedPost();
    const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');

    await editorScreen.titleInput().fill('My title');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    await saveShortcut();
    await expect.poll(() => shared.saveApi.requests.length).toBe(1);
    await editorReadLanded(queryClient, shared.stored());

    await appendToBody(' and more');
    await saveShortcut();

    await expect.poll(() => shared.saveApi.requests.length).toBe(2);
    expect(submittedPost(shared.saveApi)).toMatchObject({ updated_at: MY_SAVE_AT });
    await expect.poll(unsavedChangesGuarded).toBe(false);
    await expect(editorScreen.conflictBanner()).toHaveCount(0);
    expect(shared.stored()).toMatchObject({ title: 'My title' });
    expect(shared.stored().lexical).toContain('Hello from React and more');
  });

  it('reopens on its own save before the read after it lands, and saves again without a conflict', async () => {
    const shared = fakeSharedPost();
    const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    const releaseReads = shared.holdReads();

    await editorScreen.titleInput().fill('My title');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    await saveShortcut();
    await expect.poll(() => shared.saveApi.requests.length).toBe(1);
    await expect.poll(() => shared.readApi.requests.length).toBe(2);
    await expect.poll(unsavedChangesGuarded).toBe(false);

    await editorScreen.backLink('post').click();
    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.titleInput()).toHaveCount(0);
    window.location.hash = `#/editor/post/${POST_ID}`;

    await expect.element(editorScreen.titleInput()).toHaveValue('My title');
    releaseReads();
    await editorReadLanded(queryClient, shared.stored());

    await appendToBody(' and more');
    await saveShortcut();

    await expect.poll(() => shared.saveApi.requests.length).toBe(2);
    expect(submittedPost(shared.saveApi)).toMatchObject({ updated_at: MY_SAVE_AT });
    await expect.poll(unsavedChangesGuarded).toBe(false);
    await expect(editorScreen.conflictBanner()).toHaveCount(0);
    expect(shared.stored().lexical).toContain('Hello from React and more');
  });

  it.each<[string, Role, Partial<Post>]>([
    [
      'publishes a Contributor’s draft',
      'Contributor',
      { status: 'published', published_at: '2026-01-01T00:00:02.000Z' },
    ],
    ['drops the Author from its authors', 'Author', { authors: [{ id: 'other-user' }] }],
  ])(
    'keeps the editor and the unsaved text when another writer %s, and stops saving at the refusal',
    async (_change, role, theirChanges) => {
      const shared = fakeSharedPost(
        { authors: [{ id: CURRENT_USER_ID }] },
        { canSave: (stored) => mayEdit(role, stored) },
      );
      const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, bootAs(role));
      const releaseReads = await saveThenTheySave(shared, saveShortcut, theirChanges);
      const editor = editorScreen.root().element();
      await appendToBody(' and mine');

      releaseReads();
      await editorReadLanded(queryClient, shared.stored());

      expect(editor.isConnected).toBe(true);
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and mine');

      await saveShortcut();

      await expect
        .element(editorScreen.conflictBanner())
        .toHaveTextContent('You no longer have permission to edit this post');
      await expect.element(editorScreen.copyConflictedContent()).toBeVisible();
      await expect(editorScreen.saveErrorBanner()).toHaveCount(0);
      expect(shared.saveApi.requests).toHaveLength(2);
      await expect.element(editorScreen.titleInput()).toHaveValue('My title');
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and mine');
    },
  );

  it('returns an Author to the list when the refetch of a reopened post finds them removed', async () => {
    fakePostsListScreen();
    const shared = fakeSharedPost(
      { authors: [{ id: CURRENT_USER_ID }] },
      { canSave: (stored) => mayEdit('Author', stored) },
    );
    const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, bootAs('Author'));
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    await editorScreen.backLink('post').click();
    await expect(editorScreen.root()).toHaveCount(0);

    shared.theySave({ authors: [{ id: 'other-user' }] });
    // A save to any post marks every post read stale, so the reopen starts from the cached copy.
    await queryClient.invalidateQueries({ queryKey: [postsDataType] });
    window.location.hash = `/editor/post/${POST_ID}`;

    await expect.poll(() => shared.readApi.requests.length).toBeGreaterThan(1);
    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('keeps the editor open when a refetch brings a version stored only as mobiledoc', async () => {
    const shared = fakeSharedPost();
    const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    const releaseReads = await saveThenTheySave(shared, saveShortcut, {
      lexical: null,
      mobiledoc: MOBILEDOC,
    });
    const editor = editorScreen.root().element();
    await appendToBody(' and mine');

    releaseReads();
    await editorReadLanded(queryClient, shared.stored());

    expect(editor.isConnected).toBe(true);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and mine');
    // A conversion would be a second write.
    expect(shared.saveApi.requests).toHaveLength(1);
  });
});

/** A read at the version this tab holds brings another writer's alt text and caption. */
async function theirAltAndCaptionLanded(
  overrides: Partial<Post> = {},
  whileReadIsHeld: () => Promise<void> = async () => {},
) {
  const shared = fakeSharedPost({
    feature_image: 'https://example.com/content/images/hills.png',
    feature_image_alt: 'My alt',
    feature_image_caption: 'My caption',
    ...overrides,
  });
  const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
  await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
  const releaseReads = shared.holdReads();

  await editorScreen.titleInput().fill('My title');
  await expect.poll(unsavedChangesGuarded).toBe(true);
  await (shared.stored().status === 'draft' ? saveShortcut() : editorScreen.updateButton().click());
  await expect.poll(() => shared.saveApi.requests.length).toBe(1);
  await expect.poll(() => shared.readApi.requests.length).toBe(2);
  shared.theySaveBeside({
    feature_image_alt: 'Their alt',
    feature_image_caption: 'Their caption',
  });
  await whileReadIsHeld();
  releaseReads();
  await editorReadLanded(queryClient, shared.stored());
  return shared;
}

/**
 * Core stores the feature image's alt text and caption beside the post, so another
 * writer's edit to them reaches this tab in a read at its own version.
 */
describe('Post editor refetch of another writer’s alt text and caption', () => {
  it('shows them, stays saved and sends them on with the next save', async () => {
    const shared = await theirAltAndCaptionLanded();

    await expect.element(editorScreen.featureImageCaption()).toHaveTextContent('Their caption');
    await expect.poll(unsavedChangesGuarded).toBe(false);
    await editorScreen.featureImageAltToggle().click();
    await expect.element(editorScreen.featureImageAltInput()).toHaveValue('Their alt');
    await appendToBody(' and mine');
    await saveShortcut();

    await expect.poll(() => shared.saveApi.requests.length).toBe(2);
    expect(submittedPost(shared.saveApi)).toMatchObject({
      feature_image_alt: 'Their alt',
      feature_image_caption: 'Their caption',
    });
    expect(shared.stored()).toMatchObject({
      feature_image_alt: 'Their alt',
      feature_image_caption: 'Their caption',
    });
  });

  it.each([
    { typed: '{End} more', caption: 'Their caption more' },
    { typed: '{End}x{Backspace}', caption: 'Their caption' },
  ])('builds the caption typed as $typed on theirs', async ({ typed, caption }) => {
    const shared = await theirAltAndCaptionLanded();
    await expect.element(editorScreen.featureImageCaption()).toHaveTextContent('Their caption');

    await editorScreen.featureImageCaption().click();
    await userEvent.keyboard(typed);
    await editorScreen.titleInput().click();
    await appendToBody(' and mine');
    await saveShortcut();

    await expect.poll(() => String(submittedPost(shared.saveApi).lexical)).toContain('and mine');
    const sent = submittedPost(shared.saveApi);
    expect(String(sent.feature_image_caption)).toContain(caption);
    expect(String(sent.feature_image_caption)).not.toContain('My caption');
    expect(sent.feature_image_alt).toBe('Their alt');
  });

  it('shows their caption once the writer leaves the caption they were in', async () => {
    const shared = await theirAltAndCaptionLanded({}, () =>
      editorScreen.featureImageCaption().click(),
    );

    await expect.element(editorScreen.featureImageCaption()).toHaveTextContent('My caption');
    await editorScreen.titleInput().click();

    await expect.element(editorScreen.featureImageCaption()).toHaveTextContent('Their caption');
    await appendToBody(' and mine');
    await saveShortcut();

    await expect.poll(() => String(submittedPost(shared.saveApi).lexical)).toContain('and mine');
    expect(submittedPost(shared.saveApi)).toMatchObject({
      feature_image_alt: 'Their alt',
      feature_image_caption: 'Their caption',
    });
  });

  it('stays saved on a published post when a keystroke in their alt text is undone', async () => {
    const shared = await theirAltAndCaptionLanded({
      status: 'published',
      published_at: '2025-12-01T00:00:00.000Z',
    });

    await editorScreen.featureImageAltToggle().click();
    await expect.element(editorScreen.featureImageAltInput()).toHaveValue('Their alt');
    await userEvent.keyboard('{End}x{Backspace}');

    await expect.element(editorScreen.featureImageAltInput()).toHaveValue('Their alt');
    await expect.element(editorScreen.updateButton()).toBeDisabled();
    expect(shared.saveApi.requests).toHaveLength(1);
    expect(shared.stored()).toMatchObject({ feature_image_alt: 'Their alt' });
  });
});
