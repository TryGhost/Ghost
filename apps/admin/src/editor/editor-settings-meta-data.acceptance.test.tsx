import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeTiers,
  post,
  renderAdminApp,
  staffRole,
  submittedPost,
  unsavedChangesGuarded,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { previewScreen } from '@/editor/preview/preview.screen';

const POST_ID = 'abc123';
const CURRENT_USER_ID = '1';
const FLAG_ON = { labs: { editorReact: true } };
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const BACK_LABEL = 'Close meta data panel';
const PLACEHOLDER =
  'Search engines will automatically show a custom preview of content related to the search term here if no custom meta description is set.';

// A settings save waits on the engine's queue, so these journeys outlast the default timeout.
const SLOW = 20_000;
const POLL = { timeout: 10_000 };
// Under the 3s autosave debounce, so only an undebounced field save can satisfy it.
const FIELD_POLL = { timeout: 2_000 };

type SavedPost = ReturnType<typeof post>;

function asRole(name: StaffRoleName) {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

function editorChrome() {
  fakeEditorChrome();
  fakeTiers([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

/** A post that answers saves the way Ghost does: submitted fields back, fresh token. */
function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  editorChrome();
  return fakeEditorPost({
    custom_excerpt: null,
    meta_title: null,
    meta_description: null,
    tags: [],
    ...overrides,
  });
}

async function openMetaData() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await editorScreen.settingsSubviewRow('Meta data').click();
  await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
}

/** Whether the countdown is showing the writer they are past the recommendation. */
function countdownIsOver(): boolean {
  return !!editorScreen.settingsSubviewPane().element().querySelector('span.text-destructive');
}

/**
 * The sidebar's Meta data pane: the title and description search engines are
 * given instead of the post's own, and the result they produce.
 */
describe('Post settings meta data', () => {
  it(
    'opens the pane over the section list and comes back from it',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      // The pane replaces the list it was opened from.
      await expect(editorScreen.settingsExcerpt()).toHaveCount(0);
      await expect.element(editorScreen.settingsMetaTitle()).toBeVisible();

      await editorScreen.settingsSubviewBack(BACK_LABEL).click();

      await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
      await expect.element(editorScreen.settingsExcerpt()).toBeVisible();
      await expect.element(editorScreen.settingsSubviewRow('Meta data')).toBeVisible();
    },
    SLOW,
  );

  it(
    'names the panel after the pane it is showing',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      await expect
        .element(editorScreen.settingsSidebar())
        .toHaveAttribute('aria-label', 'Meta data');
      await expect
        .element(page.getByRole('heading', { level: 2, name: 'Meta data' }))
        .toBeVisible();
    },
    SLOW,
  );

  it(
    'closes the pane on Escape',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      await userEvent.keyboard('{Escape}');

      await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
      await expect.element(editorScreen.settingsSubviewRow('Meta data')).toBeVisible();
    },
    SLOW,
  );

  it(
    'leaves the pane open for an Escape the preview has already answered',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      await editorScreen.previewButton().click();
      await expect.element(previewScreen.modal()).toBeVisible();

      await userEvent.keyboard('{Escape}');

      await expect(previewScreen.modal()).toHaveCount(0);
      await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
    },
    SLOW,
  );

  it.each(['title', 'description'] as const)(
    'saves the focused meta %s edit when Escape closes the pane',
    async (field) => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      const input =
        field === 'title'
          ? editorScreen.settingsMetaTitle()
          : editorScreen.settingsMetaDescription();
      await input.fill('Saved when the pane closes');
      await userEvent.keyboard('{Escape}');

      await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
      await expect.element(editorScreen.settingsSubviewRow('Meta data')).toHaveFocus();
      await expect
        .poll(() => submittedPost(saveApi)[`meta_${field}`], FIELD_POLL)
        .toBe('Saved when the pane closes');
    },
    SLOW,
  );

  it(
    'moves focus into the pane and back to the row it was opened from',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      await expect
        .poll(
          () => document.activeElement === editorScreen.settingsSubviewBack(BACK_LABEL).element(),
        )
        .toBe(true);

      await editorScreen.settingsSubviewBack(BACK_LABEL).click();

      await expect.element(editorScreen.settingsSubviewRow('Meta data')).toBeVisible();
      await expect
        .poll(
          () => document.activeElement === editorScreen.settingsSubviewRow('Meta data').element(),
        )
        .toBe(true);
    },
    SLOW,
  );

  it(
    'reopens the sidebar on the section list rather than the pane',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      await editorScreen.settingsToggle().click();
      await expect(editorScreen.settingsSidebar()).toHaveCount(0);
      await editorScreen.settingsToggle().click();

      await expect.element(editorScreen.settingsSidebar()).toBeVisible();
      await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
      await expect.element(editorScreen.settingsSubviewRow('Meta data')).toBeVisible();
    },
    SLOW,
  );

  it(
    'persists a draft’s meta title and description on the blur that ends each edit',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      await editorScreen.settingsMetaTitle().fill('A better title for search');
      await editorScreen.settingsMetaDescription().click();

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ meta_title: 'A better title for search' });

      await editorScreen.settingsMetaDescription().fill('What this post is about');
      await editorScreen.settingsMetaTitle().click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
      expect(submittedPost(saveApi)).toMatchObject({
        meta_description: 'What this post is about',
      });
    },
    SLOW,
  );

  it(
    'stages a published post’s meta title until Update',
    async () => {
      const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      await editorScreen.settingsMetaTitle().fill('A better title for search');
      await editorScreen.settingsMetaDescription().click();

      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        meta_title: 'A better title for search',
        status: 'published',
      });
    },
    SLOW,
  );

  it(
    'counts the characters used against the recommendation',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      await expect
        .element(editorScreen.settingsSubviewPane())
        .toHaveTextContent("Recommended: 60 characters. You've used 0");
      await expect
        .element(editorScreen.settingsSubviewPane())
        .toHaveTextContent("Recommended: 145 characters. You've used 0");
      expect(countdownIsOver()).toBe(false);

      await editorScreen.settingsMetaTitle().fill('a'.repeat(61));

      await expect
        .element(editorScreen.settingsSubviewPane())
        .toHaveTextContent("Recommended: 60 characters. You've used 61");
      expect(countdownIsOver()).toBe(true);
    },
    SLOW,
  );

  it(
    'refuses to save a meta title longer than the field holds',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      await editorScreen.settingsMetaTitle().fill('a'.repeat(301));
      await editorScreen.settingsMetaDescription().click();

      await expect
        .element(editorScreen.settingsSubviewPane().getByRole('alert'))
        .toHaveTextContent('Meta Title cannot be longer than 300 characters.');
      await expect
        .element(editorScreen.settingsMetaTitle())
        .toHaveAttribute('aria-invalid', 'true');
      // Refused where the writer is typing rather than as a save they did not ask for.
      await expect.poll(unsavedChangesGuarded).toBe(true);
      await expect(editorScreen.saveErrorBanner()).toHaveCount(0);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect
        .element(editorScreen.saveErrorBanner())
        .toHaveTextContent('Meta Title cannot be longer than 300 characters.');
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'previews the post’s own title and excerpt until the meta fields carry their own',
    async () => {
      fakeSavablePost({ custom_excerpt: 'The excerpt this post already has' });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      const preview = editorScreen.settingsSerpPreview();
      await expect.element(preview).toHaveTextContent('hello-from-react');
      await expect.element(preview).toHaveTextContent('Hello from React');
      await expect.element(preview).toHaveTextContent('The excerpt this post already has');

      await editorScreen.settingsMetaTitle().fill('A better title for search');
      await editorScreen.settingsMetaDescription().fill('What this post is about');

      await expect.element(preview).toHaveTextContent('A better title for search');
      await expect.element(preview).toHaveTextContent('What this post is about');
      await expect.element(preview).not.toHaveTextContent('The excerpt this post already has');
    },
    SLOW,
  );

  it(
    'keeps the preview in sync with the inline excerpt while published edits are staged',
    async () => {
      const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, {
        labs: { editorReact: true, editorExcerpt: true },
      });
      await openMetaData();

      await editorScreen.excerptInput().fill('First unsaved summary');
      await expect
        .element(editorScreen.settingsSerpPreview())
        .toHaveTextContent('First unsaved summary');
      // Already dirty: another edit must update the preview without a save or dirty-state transition.
      await editorScreen.excerptInput().fill('The latest unsaved summary');
      await expect
        .element(editorScreen.settingsSerpPreview())
        .toHaveTextContent('The latest unsaved summary');
      await expect
        .element(editorScreen.settingsMetaDescription())
        .toHaveAttribute('placeholder', 'The latest unsaved summary');
      await expect.element(editorScreen.excerptInput()).toHaveValue('The latest unsaved summary');
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'explains the result a post with no description of its own gets',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      await expect.element(editorScreen.settingsSerpPreview()).toHaveTextContent(PLACEHOLDER);
    },
    SLOW,
  );

  it(
    'gives a contributor the pane their role can write',
    async () => {
      // A contributor may only open a draft they authored.
      const saveApi = fakeSavablePost({ authors: [{ id: CURRENT_USER_ID }] });
      await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));
      await openMetaData();

      await editorScreen.settingsMetaTitle().fill('A contributor’s meta title');
      await editorScreen.settingsMetaDescription().click();

      await expect
        .poll(() => submittedPost(saveApi).meta_title, POLL)
        .toBe('A contributor’s meta title');
    },
    SLOW,
  );
});
