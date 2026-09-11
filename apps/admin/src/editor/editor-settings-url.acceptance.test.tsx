import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  currentRoute,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  post,
  renderAdminApp,
  submittedPost,
  unsavedChangesGuarded,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';

// A slug edit waits on the generator and then on the save queue.
const SLOW = 20_000;
const POLL = { timeout: 10_000 };
// Under the 3s autosave debounce, so only an undebounced field save can satisfy it.
const FIELD_POLL = { timeout: 2_000 };

type SavedPost = ReturnType<typeof post>;

/** The slugs endpoint, answering with the requested name unless it is taken. */
function fakeSlugs(taken: Record<string, string> = {}) {
  return fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => {
    const requested = decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]);
    return { slugs: [{ slug: taken[requested] ?? requested }] };
  });
}

/** A post that answers saves the way Ghost does: submitted fields back, fresh token. */
function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  fakeEditorChrome();

  return fakeEditorPost(overrides);
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
    'saves the focused URL edit with Cmd-S while generation is pending',
    async () => {
      const generated = deferred<{ slugs: { slug: string }[] }>();
      const slugApi = fakeAdminEndpoint('GET', /^\/slugs\/post\//, () => generated.promise);
      // Keep the body empty so only the pending URL edit can dirty this post.
      const saveApi = fakeSavablePost({
        status: 'published',
        published_at: PUBLISHED_AT,
        lexical: null,
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await editorScreen.settingsSlug().fill('new-slug');
      await userEvent.keyboard('{Meta>}s{/Meta}');
      await expect.poll(() => slugApi.requests.length, POLL).toBe(1);
      await expect.element(editorScreen.settingsSlug()).toBeDisabled();

      generated.resolve({ slugs: [{ slug: 'new-slug-2' }] });
      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ slug: 'new-slug-2', status: 'published' });
      await expect.element(editorScreen.settingsSlug()).toHaveValue('new-slug-2');
      await expect.element(editorScreen.updateButton()).toBeDisabled();
    },
    SLOW,
  );

  it(
    'guards navigation and tab closing while a manual URL is still being generated',
    async () => {
      const generated = deferred<{ slugs: { slug: string }[] }>();
      fakeAdminEndpoint('GET', /^\/slugs\/post\//, () => generated.promise);
      const saveApi = fakeSavablePost({
        status: 'published',
        published_at: PUBLISHED_AT,
        lexical: null,
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, {
        labs: { editorReact: true, postsListReact: true },
      });
      await openSidebar();

      await editorScreen.settingsSlug().fill('new-slug');
      await userEvent.keyboard('{Enter}');
      await expect.element(editorScreen.settingsSlug()).toBeDisabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);
      const unload = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(unload);
      expect(unload.defaultPrevented).toBe(true);

      await editorScreen.backLink('post').click();
      await expect.element(editorScreen.leaveDialog()).toBeVisible();
      await editorScreen.stayInEditor().click();
      await expect(editorScreen.leaveDialog()).toHaveCount(0);
      expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);

      generated.resolve({ slugs: [{ slug: 'new-slug' }] });
      await expect.element(editorScreen.settingsSlug()).toHaveValue('new-slug');
      await expect.element(editorScreen.updateButton()).toBeEnabled();
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

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
    'reverts the slug and says so when the generator fails',
    async () => {
      fakeAdminEndpoint('GET', /^\/slugs\/post\//, { errors: [] }, { status: 500 });
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await editorScreen.settingsSlug().fill('new-slug');
      await userEvent.keyboard('{Enter}');

      await expect
        .element(editorScreen.settingsSlugError())
        .toHaveTextContent('Couldn’t update the URL.');
      // The message is the input's own error, not loose text beside it.
      const input = editorScreen.settingsSlug().element();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input.getAttribute('aria-describedby')).toBe(
        editorScreen.settingsSlugError().element().id,
      );
      await expect.element(editorScreen.settingsSlug()).toHaveValue('hello-from-react');
      await expect
        .element(editorScreen.settingsUrlPreview())
        .toHaveTextContent('test.com/hello-from-react/');
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'holds the input shut until the generator answers',
    async () => {
      let answerGenerator: () => void = () => {};
      const answered = new Promise<void>((resolve) => {
        answerGenerator = resolve;
      });
      fakeAdminEndpoint('GET', /^\/slugs\/post\//, async () => {
        await answered;
        return { slugs: [{ slug: 'new-slug' }] };
      });
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await editorScreen.settingsSlug().fill('new-slug');
      await userEvent.keyboard('{Enter}');

      await expect.element(editorScreen.settingsSlug()).toBeDisabled();

      answerGenerator();

      await expect.element(editorScreen.settingsSlug()).toBeEnabled();
      await expect.element(editorScreen.settingsSlug()).toHaveValue('new-slug');
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
