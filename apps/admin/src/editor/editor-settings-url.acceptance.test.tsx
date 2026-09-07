import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  fakeAdminEndpoint,
  fakeMembers,
  fakeNewsletters,
  fakePosts,
  fakeSnippets,
  post,
  renderAdminApp,
  type EndpointCapture,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);

// A slug edit waits on the generator and then on the save queue.
const SLOW = 20_000;
const POLL = { timeout: 10_000 };
// Under the 3s autosave debounce, so only an undebounced field save can satisfy it.
const FIELD_POLL = { timeout: 2_000 };

type SavedPost = ReturnType<typeof post>;

function submittedPost(capture: EndpointCapture): Record<string, unknown> {
  const body = capture.lastRequest?.body as { posts: Record<string, unknown>[] } | undefined;
  return body?.posts[0] ?? {};
}

/** The slugs endpoint, answering with the requested name unless it is taken. */
function fakeSlugs(taken: Record<string, string> = {}) {
  return fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => {
    const requested = decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]);
    return { slugs: [{ slug: taken[requested] ?? requested }] };
  });
}

/** A post that answers saves the way Ghost does: submitted fields back, fresh token. */
function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  fakeSnippets([]);
  fakePosts([]);
  // The header's publish inputs read the site's member total and newsletter list.
  fakeMembers([]);
  fakeNewsletters([]);

  let current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    ...overrides,
  });
  let saves = 0;

  fakeAdminEndpoint('GET', ROUTE, () => ({ posts: [current] }));

  return fakeAdminEndpoint('PUT', ROUTE, ({ body }) => {
    saves += 1;
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
    return { posts: [current] };
  });
}

async function openSidebar() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
}

/**
 * The settings sidebar's URL section: the slug the post will live at, routed
 * through the slug machine rather than written as a settings field.
 */
describe('Post settings URL', () => {
  it(
    'persists a draft’s edited slug and previews the deduped value',
    async () => {
      const slugApi = fakeSlugs({ 'new-slug': 'new-slug-2' });
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await expect.element(page.getByLabelText('Post URL')).toBeVisible();
      await expect
        .element(editorScreen.settingsUrlPreview())
        .toHaveTextContent('test.com/hello-from-react/');

      await editorScreen.settingsSlug().fill('new-slug');
      await editorScreen.titleInput().click();

      await expect.poll(() => slugApi.requests.length, POLL).toBe(1);
      expect(slugApi.requests[0].url).toContain('/slugs/post/new-slug/');

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ slug: 'new-slug-2' });
      await expect.element(editorScreen.settingsSlug()).toHaveValue('new-slug-2');
      await expect
        .element(editorScreen.settingsUrlPreview())
        .toHaveTextContent('test.com/new-slug-2/');
      await expect.element(editorScreen.status()).toHaveTextContent('Draft - Saved');
    },
    SLOW,
  );

  it(
    'stages a published post’s slug until Update',
    async () => {
      fakeSlugs();
      const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await expect.element(editorScreen.updateButton()).toBeDisabled();

      await editorScreen.settingsSlug().fill('published-slug');
      await userEvent.keyboard('{Enter}');

      // The unsaved signal for a published post is the Update button, not a save.
      await expect.element(editorScreen.updateButton()).toBeEnabled();
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        slug: 'published-slug',
        status: 'published',
      });
      await expect.element(editorScreen.updateButton()).toBeDisabled();
    },
    SLOW,
  );

  it(
    'leaves a manually edited slug alone when the title changes',
    async () => {
      const slugApi = fakeSlugs();
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await editorScreen.settingsSlug().fill('chosen-by-hand');
      await userEvent.keyboard('{Enter}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      await expect.element(editorScreen.settingsSlug()).toHaveValue('chosen-by-hand');

      await editorScreen.titleInput().fill('Something else entirely');
      await editorScreen.body().click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
      expect(submittedPost(saveApi)).toMatchObject({
        title: 'Something else entirely',
        slug: 'chosen-by-hand',
      });
      expect(slugApi.requests).toHaveLength(1);
      await expect.element(editorScreen.settingsSlug()).toHaveValue('chosen-by-hand');
    },
    SLOW,
  );

  it(
    'asks for nothing when the field is left as the post already reads',
    async () => {
      const slugApi = fakeSlugs();
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await editorScreen.settingsSlug().fill('hello-from-react');
      await editorScreen.titleInput().click();

      // The next edit is the first request, so the unchanged blur asked for nothing.
      await editorScreen.settingsSlug().fill('actually-new');
      await userEvent.keyboard('{Enter}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(slugApi.requests).toHaveLength(1);
      expect(slugApi.requests[0].url).toContain('/slugs/post/actually-new/');
    },
    SLOW,
  );
});
