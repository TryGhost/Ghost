import { describe, expect, it } from 'vitest';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeTags,
  post,
  renderAdminApp,
  submittedPost,
  tag,
  unsavedChangesGuarded,
  withoutAutosave,
} from '@test-utils/acceptance';
import { settingsMetaDataRow } from '@tryghost/test-data/selectors/editor';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const FLAG_ON = withoutAutosave({ labs: { editorReact: true } });
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const FIRST_SAVE_AT = '2026-01-01T00:00:01.000Z';
const THEIR_SAVE_AT = '2026-01-01T00:00:05.000Z';
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const SCHEDULED_FOR = '2099-01-01T10:00:00.000Z';
const ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);
const POLL = { timeout: 10_000 };
const REFUSED = 'Validation failed for meta_title.';

const NEWS = tag({ id: 'tag1', name: 'News', slug: 'news', visibility: 'public' });

/** What a settings save sends beside the settings: the canvas as loaded. */
const SAVED_CANVAS = {
  title: 'Hello from React',
  slug: 'hello-from-react',
  lexical: buildLexicalParagraph('Hello from React'),
  feature_image: null,
};

// What Core's collision check watches: the posts row and the tag, author and tier
// relations. The fields Core stores beside the post, such as the meta title, are not.
const COLLISION_CHECKED = [
  'title',
  'slug',
  'lexical',
  'feature_image',
  'custom_excerpt',
  'featured',
  'visibility',
  'status',
  'published_at',
  'tags',
  'authors',
  'tiers',
] as const;

/** Relations compare by identity, everything else by value. */
function sameValue(left: unknown, right: unknown): boolean {
  const identity = (value: unknown) =>
    Array.isArray(value)
      ? value.map((entry: { id?: string; name?: string }) => entry.id ?? entry.name)
      : (value ?? null);
  return JSON.stringify(identity(left)) === JSON.stringify(identity(right));
}

type SavedPost = ReturnType<typeof post>;

function refusal(status: number, error: Record<string, string>): Response {
  return new Response(JSON.stringify({ errors: [error] }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * A post that answers writes as Core does: one that changes what its collision
 * check watches collides unless it carries the server's token, and a tag sent by
 * id comes back whole.
 */
function fakeCorePost(overrides: Partial<SavedPost>) {
  fakeEditorChrome();
  fakeTags([NEWS]);
  let current = post({
    id: POST_ID,
    ...SAVED_CANVAS,
    custom_excerpt: null,
    tags: [],
    featured: false,
    updated_at: LOADED_AT,
    ...overrides,
  });
  let saves = 0;
  let refusals = 0;

  fakeAdminEndpoint('GET', ROUTE, () => ({ posts: [current] }));
  const saveApi = fakeAdminEndpoint('PUT', ROUTE, ({ body }) => {
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    const checked = COLLISION_CHECKED.some(
      (key) => key in submitted && !sameValue(submitted[key], current[key]),
    );
    if (checked && submitted.updated_at !== current.updated_at) {
      return refusal(409, {
        code: 'UPDATE_COLLISION',
        type: 'UpdateCollisionError',
        message: 'Saving failed! Someone else is editing this post.',
      });
    }
    if (refusals > 0) {
      refusals -= 1;
      return refusal(422, {
        type: 'ValidationError',
        message: 'Validation error, cannot edit post.',
        context: REFUSED,
      });
    }
    saves += 1;
    current = {
      ...current,
      ...submitted,
      tags: (submitted.tags ?? current.tags ?? []).map((sent) =>
        sent.id === NEWS.id ? NEWS : sent,
      ),
      updated_at: `2026-01-01T00:00:0${saves}.000Z`,
    };
    return { posts: [current] };
  });

  return {
    saveApi,
    /** Another writer saves the post meanwhile, which moves the server's token. */
    writeElsewhere: (changes: Partial<SavedPost>) => {
      current = { ...current, ...changes, updated_at: THEIR_SAVE_AT };
    },
    /** The server refuses the next write it would otherwise take. */
    refuseNext: () => {
      refusals += 1;
    },
  };
}

async function openSidebar() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
}

async function addNewsTag() {
  await openSidebar();
  await editorScreen.settingsTagsInput().click();
  await editorScreen.settingsTagOption('News').click();
}

async function stageBodyEdit() {
  await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
  await editorScreen.body().fill('Hello from React, edited');
  await expect.element(editorScreen.updateButton()).toBeEnabled();
}

/**
 * The settings panel of a published, scheduled or sent post: each change saves
 * on its own over the saved canvas, while the writer's canvas waits for Update.
 */
describe('Post settings saving', () => {
  it('saves a published post’s tag change at once, and leaves a staged body for Update', async () => {
    const { saveApi } = fakeCorePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await stageBodyEdit();

    await addNewsTag();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toEqual({
      id: POST_ID,
      updated_at: LOADED_AT,
      ...SAVED_CANVAS,
      tags: [{ id: 'tag1' }],
    });
    expect(saveApi.lastRequest?.url).not.toContain('save_revision');
    await expect.element(editorScreen.updateButton()).toBeEnabled();
    expect(unsavedChangesGuarded()).toBe(true);

    await editorScreen.updateButton().click();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
    expect(submittedPost(saveApi)).toMatchObject({
      title: 'Hello from React',
      status: 'published',
      updated_at: FIRST_SAVE_AT,
    });
    expect(String(submittedPost(saveApi).lexical)).toContain('Hello from React, edited');
    await expect.poll(unsavedChangesGuarded).toBe(false);
  });

  it('collides with another writer’s newer canvas instead of taking it, keeping the staged body', async () => {
    const { saveApi, writeElsewhere } = fakeCorePost({
      status: 'published',
      published_at: PUBLISHED_AT,
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await stageBodyEdit();
    writeElsewhere({ title: 'Their title', lexical: buildLexicalParagraph('Their body') });

    // A meta title is stored beside the post, so only the saved canvas can collide.
    await openSidebar();
    await editorScreen.settingsSubviewRow(settingsMetaDataRow).click();
    await editorScreen.settingsMetaTitle().fill('A better title for search');
    await editorScreen.settingsMetaDescription().click();

    await expect
      .element(editorScreen.conflictBanner())
      .toHaveTextContent('Someone else is editing this post');
    expect(saveApi.requests).toHaveLength(1);
    expect(submittedPost(saveApi)).toMatchObject({
      ...SAVED_CANVAS,
      meta_title: 'A better title for search',
      updated_at: LOADED_AT,
    });
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React, edited');
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    await expect.element(editorScreen.settingsMetaTitle()).toHaveValue('A better title for search');
  });

  it('saves a scheduled post’s Featured switch at once without moving its schedule', async () => {
    const { saveApi } = fakeCorePost({ status: 'scheduled', published_at: SCHEDULED_FOR });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openSidebar();

    await editorScreen.settingsFeatured().click();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toEqual({
      id: POST_ID,
      updated_at: LOADED_AT,
      ...SAVED_CANVAS,
      featured: true,
    });
    await expect.element(editorScreen.status()).toHaveTextContent('Scheduled');
    await expect.element(editorScreen.updateButton()).toBeDisabled();
    await expect.poll(unsavedChangesGuarded).toBe(false);
  });

  it('saves a sent post’s tag change at once with the tags and the saved canvas', async () => {
    const { saveApi } = fakeCorePost({ status: 'sent', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await addNewsTag();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toEqual({
      id: POST_ID,
      updated_at: LOADED_AT,
      ...SAVED_CANVAS,
      tags: [{ id: 'tag1' }],
    });
    await expect.element(editorScreen.updateButton()).toBeDisabled();
    await expect.poll(unsavedChangesGuarded).toBe(false);
  });

  it('leaves the excerpt typed under the title for Update when a setting saves', async () => {
    const { saveApi } = fakeCorePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(
      `/editor/post/${POST_ID}`,
      withoutAutosave({ labs: { editorReact: true, editorExcerpt: true } }),
    );
    await editorScreen.excerptInput().fill('A staged excerpt');
    await openSidebar();

    await editorScreen.settingsFeatured().click();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toEqual({
      id: POST_ID,
      updated_at: LOADED_AT,
      ...SAVED_CANVAS,
      custom_excerpt: null,
      featured: true,
    });
    await expect.element(editorScreen.updateButton()).toBeEnabled();

    await editorScreen.updateButton().click();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
    expect(submittedPost(saveApi)).toMatchObject({ custom_excerpt: 'A staged excerpt' });
  });

  it('keeps a settings change the server refuses, and retries it without the staged body', async () => {
    const { saveApi, refuseNext } = fakeCorePost({
      status: 'published',
      published_at: PUBLISHED_AT,
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await stageBodyEdit();
    refuseNext();

    await addNewsTag();

    await expect.element(editorScreen.saveErrorBanner()).toHaveTextContent(REFUSED);
    expect(saveApi.requests).toHaveLength(1);
    await expect.element(editorScreen.settingsTagsField()).toHaveTextContent('News');
    await expect.element(editorScreen.updateButton()).toBeEnabled();
    expect(unsavedChangesGuarded()).toBe(true);

    await editorScreen.retrySave().click();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
    expect(submittedPost(saveApi)).toEqual({
      id: POST_ID,
      updated_at: LOADED_AT,
      ...SAVED_CANVAS,
      tags: [{ id: 'tag1' }],
    });
    await expect(editorScreen.saveErrorBanner()).toHaveCount(0);
    await expect.element(editorScreen.updateButton()).toBeEnabled();
  });
});
