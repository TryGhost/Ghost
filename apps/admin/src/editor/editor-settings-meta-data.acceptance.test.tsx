import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  settingsMetaDataBackButton,
  settingsMetaDataRow,
} from '@tryghost/test-data/selectors/editor';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeTiers,
  post,
  renderAdminApp,
  staffRole,
  settleTransitions,
  submittedPost,
  unsavedChangesGuarded,
  withoutAutosave,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { previewScreen } from '@/editor/preview/preview.screen';

const POST_ID = 'abc123';
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const CURRENT_USER_ID = '1';
const FLAG_ON = withoutAutosave({ labs: { editorReact: true } });
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const PLACEHOLDER =
  'Search engines will automatically show a custom preview of content related to the search term here if no custom meta description is set.';

const POLL = { timeout: 10_000 };

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
  await settleTransitions();
  await editorScreen.settingsSubviewRow(settingsMetaDataRow).click();
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
  it('saves a canonical URL on the blur that ends the edit and previews it', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await editorScreen.settingsCanonicalUrl().fill('https://original.example.com/story/');
    await userEvent.tab();

    await expect(saveApi).toHaveSavedFields({
      canonical_url: 'https://original.example.com/story/',
    });
    await expect
      .element(editorScreen.settingsSerpPreview())
      .toHaveTextContent('original.example.com › story');
  });

  it('changes the canonical URL a post already carries', async () => {
    const saveApi = fakeSavablePost({ canonical_url: 'https://original.example.com/story/' });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await expect
      .element(editorScreen.settingsCanonicalUrl())
      .toHaveValue('https://original.example.com/story/');
    await expect
      .element(editorScreen.settingsSerpPreview())
      .toHaveTextContent('original.example.com › story');

    await editorScreen.settingsCanonicalUrl().fill('https://syndicated.example.com/feature/');
    await userEvent.tab();

    await expect(saveApi).toHaveSavedFields({
      canonical_url: 'https://syndicated.example.com/feature/',
    });
    await expect
      .element(editorScreen.settingsSerpPreview())
      .toHaveTextContent('syndicated.example.com › feature');
  });

  it('clears the canonical URL, and the preview returns to the post’s own address', async () => {
    const saveApi = fakeSavablePost({ canonical_url: 'https://original.example.com/story/' });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await editorScreen.settingsCanonicalUrl().fill('');
    await userEvent.tab();

    await expect(saveApi).toHaveSavedFields({ canonical_url: null });
    const preview = editorScreen.settingsSerpPreview();
    await expect.element(preview).toHaveTextContent('hello-from-react');
    await expect.element(preview).not.toHaveTextContent('original.example.com');
  });

  it.each(['example.com/story/', 'https://example.com/my story/'])(
    'refuses the canonical URL %s and saves nothing until it is corrected',
    async (invalidUrl) => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openMetaData();

      await editorScreen.settingsCanonicalUrl().fill(invalidUrl);
      await userEvent.tab();

      await expect
        .element(editorScreen.settingsSubviewPane().getByRole('alert'))
        .toHaveTextContent('Please enter a valid URL');
      await expect
        .element(editorScreen.settingsCanonicalUrl())
        .toHaveAttribute('aria-invalid', 'true');
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect
        .element(editorScreen.saveErrorBanner())
        .toHaveTextContent('Please enter a valid URL');
      expect(saveApi.requests).toHaveLength(0);

      await editorScreen.settingsCanonicalUrl().fill('https://original.example.com/story/');
      await userEvent.tab();

      await expect(saveApi).toHaveSavedFields({
        canonical_url: 'https://original.example.com/story/',
      });
    },
  );

  it('opens the pane over the section list and comes back from it', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    // The pane replaces the list it was opened from.
    await expect(editorScreen.settingsExcerpt()).toHaveCount(0);
    await expect.element(editorScreen.settingsMetaTitle()).toBeVisible();

    await editorScreen.settingsSubviewBack(settingsMetaDataBackButton).click();

    await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
    await expect.element(editorScreen.settingsExcerpt()).toBeVisible();
    await expect.element(editorScreen.settingsSubviewRow(settingsMetaDataRow)).toBeVisible();
  });

  it('names the panel after the pane it is showing', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await expect
      .element(editorScreen.settingsSidebar())
      .toHaveAttribute('aria-label', settingsMetaDataRow);
    await expect
      .element(page.getByRole('heading', { level: 2, name: settingsMetaDataRow }))
      .toBeVisible();
  });

  it('closes the pane on Escape', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await userEvent.keyboard('{Escape}');

    await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
    await expect.element(editorScreen.settingsSubviewRow(settingsMetaDataRow)).toBeVisible();
  });

  it('leaves the pane open for an Escape the preview has already answered', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await editorScreen.previewButton().click();
    await expect.element(previewScreen.modal()).toBeVisible();

    await userEvent.keyboard('{Escape}');

    await expect(previewScreen.modal()).toHaveCount(0);
    await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
  });

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
      await expect.element(editorScreen.settingsSubviewRow(settingsMetaDataRow)).toHaveFocus();
      await expect(saveApi).toHaveSavedFields({
        [`meta_${field}`]: 'Saved when the pane closes',
      });
    },
  );

  it('moves focus into the pane and back to the row it was opened from', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await expect
      .poll(
        () =>
          document.activeElement ===
          editorScreen.settingsSubviewBack(settingsMetaDataBackButton).element(),
      )
      .toBe(true);

    await editorScreen.settingsSubviewBack(settingsMetaDataBackButton).click();

    await expect.element(editorScreen.settingsSubviewRow(settingsMetaDataRow)).toBeVisible();
    await expect
      .poll(
        () =>
          document.activeElement === editorScreen.settingsSubviewRow(settingsMetaDataRow).element(),
      )
      .toBe(true);
  });

  it('reopens the sidebar on the section list rather than the pane', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await editorScreen.settingsToggle().click();
    await expect(editorScreen.settingsSidebar()).toHaveCount(0);
    await editorScreen.settingsToggle().click();

    await expect.element(editorScreen.settingsSidebar()).toBeVisible();
    await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
    await expect.element(editorScreen.settingsSubviewRow(settingsMetaDataRow)).toBeVisible();
  });

  it('persists a draft’s meta title and description on the blur that ends each edit', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await editorScreen.settingsMetaTitle().fill('A better title for search');
    await editorScreen.settingsMetaDescription().click();

    await expect(saveApi).toHaveSavedFields({ meta_title: 'A better title for search' });
    expect(saveApi.requests).toHaveLength(1);

    await editorScreen.settingsMetaDescription().fill('What this post is about');
    await editorScreen.settingsMetaTitle().click();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
    expect(submittedPost(saveApi)).toMatchObject({
      meta_description: 'What this post is about',
    });
  });

  it('saves a published post’s meta title on its own', async () => {
    const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await editorScreen.settingsMetaTitle().fill('A better title for search');
    await editorScreen.settingsMetaDescription().click();

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toMatchObject({
      id: POST_ID,
      updated_at: LOADED_AT,
      meta_title: 'A better title for search',
    });
  });

  it('counts the characters used against the recommendation', async () => {
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
  });

  it('refuses to save a meta title longer than the field holds', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await editorScreen.settingsMetaTitle().fill('a'.repeat(301));
    await editorScreen.settingsMetaDescription().click();

    await expect
      .element(editorScreen.settingsSubviewPane().getByRole('alert'))
      .toHaveTextContent('Meta title cannot be longer than 300 characters.');
    await expect.element(editorScreen.settingsMetaTitle()).toHaveAttribute('aria-invalid', 'true');
    // Refused where the writer is typing rather than as a save they did not ask for.
    await expect.poll(unsavedChangesGuarded).toBe(true);
    await expect(editorScreen.saveErrorBanner()).toHaveCount(0);
    expect(saveApi.requests).toHaveLength(0);

    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect
      .element(editorScreen.saveErrorBanner())
      .toHaveTextContent('Meta title cannot be longer than 300 characters.');
    expect(saveApi.requests).toHaveLength(0);
  });

  it('previews the post’s own title and excerpt until the meta fields carry their own', async () => {
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
  });

  it('keeps the preview in sync with the inline excerpt while published edits are staged', async () => {
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
  });

  it('explains the result a post with no description of its own gets', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openMetaData();

    await expect.element(editorScreen.settingsSerpPreview()).toHaveTextContent(PLACEHOLDER);
  });

  it('gives a contributor the pane their role can write', async () => {
    // A contributor may only open a draft they authored.
    const saveApi = fakeSavablePost({ authors: [{ id: CURRENT_USER_ID }] });
    await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));
    await openMetaData();

    await editorScreen.settingsMetaTitle().fill('A contributor’s meta title');
    await editorScreen.settingsMetaDescription().click();

    await expect
      .poll(() => submittedPost(saveApi).meta_title, POLL)
      .toBe('A contributor’s meta title');
  });
});
