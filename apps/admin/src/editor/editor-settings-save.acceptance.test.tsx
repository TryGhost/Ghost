import { describe, expect, it } from 'vitest';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeTags,
  post,
  renderAdminApp,
  submittedPost,
  tag,
  unsavedChangesGuarded,
  withoutAutosave,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const FLAG_ON = withoutAutosave({ labs: { editorReact: true } });
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const FIRST_SAVE_AT = '2026-01-01T00:00:01.000Z';
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const SCHEDULED_FOR = '2099-01-01T10:00:00.000Z';
const ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);
const POLL = { timeout: 10_000 };

const NEWS = tag({ id: 'tag1', name: 'News', slug: 'news', visibility: 'public' });

type SavedPost = ReturnType<typeof post>;

/** A post whose saves answer as Ghost does, a tag submitted by id coming back whole. */
function fakeSavedPost(overrides: Partial<SavedPost>) {
  fakeEditorChrome();
  fakeTags([NEWS]);
  return fakeEditorPost({ tags: [], featured: false, ...overrides }, (saved) => ({
    ...saved,
    tags: (saved.tags ?? []).map((submitted) => (submitted.id === NEWS.id ? NEWS : submitted)),
  }));
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

/**
 * The settings panel of a published, scheduled or sent post: each change saves
 * on its own, carrying the settings alone, while the canvas waits for Update.
 */
describe('Post settings saving', () => {
  it('saves a published post’s tag change at once, and leaves a staged body for Update', async () => {
    const saveApi = fakeSavedPost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await editorScreen.body().fill('Hello from React, edited');
    await expect.element(editorScreen.updateButton()).toBeEnabled();

    await addNewsTag();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toEqual({
      id: POST_ID,
      updated_at: LOADED_AT,
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

  it('saves a scheduled post’s Featured switch at once without moving its schedule', async () => {
    const saveApi = fakeSavedPost({ status: 'scheduled', published_at: SCHEDULED_FOR });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openSidebar();

    await editorScreen.settingsFeatured().click();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toEqual({
      id: POST_ID,
      updated_at: LOADED_AT,
      featured: true,
    });
    await expect.element(editorScreen.status()).toHaveTextContent('Scheduled');
    await expect.element(editorScreen.updateButton()).toBeDisabled();
    await expect.poll(unsavedChangesGuarded).toBe(false);
  });

  it('saves a sent post’s tag change at once with the tags alone', async () => {
    const saveApi = fakeSavedPost({ status: 'sent', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await addNewsTag();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toEqual({
      id: POST_ID,
      updated_at: LOADED_AT,
      tags: [{ id: 'tag1' }],
    });
    await expect.element(editorScreen.updateButton()).toBeDisabled();
    await expect.poll(unsavedChangesGuarded).toBe(false);
  });

  it('leaves the excerpt typed under the title for Update when a setting saves', async () => {
    const saveApi = fakeSavedPost({ status: 'published', published_at: PUBLISHED_AT });
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
      featured: true,
    });
    await expect.element(editorScreen.updateButton()).toBeEnabled();

    await editorScreen.updateButton().click();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
    expect(submittedPost(saveApi)).toMatchObject({ custom_excerpt: 'A staged excerpt' });
  });

  it('keeps a settings change whose save fails, and retries the settings alone', async () => {
    fakeSavedPost({ status: 'published', published_at: PUBLISHED_AT });
    const refused = fakeAdminEndpoint(
      'PUT',
      ROUTE,
      { errors: [{ type: 'InternalServerError', message: 'The server stumbled.' }] },
      { status: 500 },
    );
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await editorScreen.body().fill('Hello from React, edited');

    await addNewsTag();

    await expect.element(editorScreen.saveErrorBanner()).toBeVisible();
    expect(refused.requests).toHaveLength(1);
    await expect.element(editorScreen.settingsTagsField()).toHaveTextContent('News');
    await expect.element(editorScreen.updateButton()).toBeEnabled();
    expect(unsavedChangesGuarded()).toBe(true);

    const retried = fakeAdminEndpoint('PUT', ROUTE, {
      posts: [
        post({
          id: POST_ID,
          title: 'Hello from React',
          slug: 'hello-from-react',
          status: 'published',
          published_at: PUBLISHED_AT,
          lexical: buildLexicalParagraph('Hello from React'),
          tags: [NEWS],
          featured: false,
          updated_at: FIRST_SAVE_AT,
        }),
      ],
    });
    await editorScreen.retrySave().click();

    await expect.poll(() => retried.requests.length, POLL).toBe(1);
    expect(submittedPost(retried)).toEqual({
      id: POST_ID,
      updated_at: LOADED_AT,
      tags: [{ id: 'tag1' }],
    });
    await expect(editorScreen.saveErrorBanner()).toHaveCount(0);
    await expect.element(editorScreen.updateButton()).toBeEnabled();
  });
});
