import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { settingsXCardBackButton, settingsXCardRow } from '@tryghost/test-data/selectors/editor';

import {
  UNSPLASH_PICKED,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeTiers,
  fakeUnsplashPhotos,
  post,
  renderAdminApp,
  staffRole,
  submittedPost,
  unsavedChangesGuarded,
  withoutAutosave,
  withoutUnsplash,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const CURRENT_USER_ID = '1';
const FLAG_ON = withoutAutosave({ labs: { editorReact: true } });
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const UPLOADED = 'https://example.com/content/images/2026/09/hills.png';
const FEATURE = 'https://example.com/content/images/2026/09/coast.png';
// The site fixture's own description, which the card falls back to last.
const SITE_DESCRIPTION = 'Thoughts, stories and ideas.';

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
    excerpt: null,
    meta_title: null,
    meta_description: null,
    twitter_image: null,
    twitter_title: null,
    twitter_description: null,
    feature_image: null,
    tags: [],
    ...overrides,
  });
}

function fakeImageUpload() {
  return fakeAdminEndpoint('POST', '/images/upload/', {
    images: [{ url: UPLOADED, ref: null }],
  });
}

async function openXCard() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await editorScreen.settingsSubviewRow(settingsXCardRow).click();
  await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
}

/**
 * The sidebar's X card pane: the image, title and description X is given
 * instead of the post's own.
 */
describe('Post settings X card', () => {
  it.each([
    { result: 'success', status: 200 },
    { result: 'failure', status: 415 },
  ])(
    'keeps a pending upload disabled after reopening the pane until $result',
    async ({ status }) => {
      const saveApi = fakeSavablePost();
      const pending = deferred<void>();
      const uploadApi = fakeAdminEndpoint(
        'POST',
        '/images/upload/',
        async () => {
          await pending.promise;
          return status === 200 ? { images: [{ url: UPLOADED, ref: null }] } : { errors: [] };
        },
        { status },
      );
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openXCard();

      try {
        await userEvent.upload(
          editorScreen.settingsXImageInput().element(),
          new File(['image'], 'hills.png', { type: 'image/png' }),
        );
        await expect.poll(() => uploadApi.requests.length, POLL).toBe(1);
        await expect.element(editorScreen.settingsXImageInput()).toBeDisabled();
        await editorScreen.settingsSubviewBack(settingsXCardBackButton).click();
        await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
        await editorScreen.settingsSubviewRow(settingsXCardRow).click();
        await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
        await expect.element(editorScreen.settingsXImageInput()).toBeDisabled();
        await expect.element(editorScreen.settingsXImageUnsplashButton()).toBeDisabled();
        expect(saveApi.requests).toHaveLength(0);
      } finally {
        pending.resolve();
        // Settle the held request even when an assertion fails.
        if (status === 200) {
          await expect(saveApi).toHaveSavedFields({ twitter_image: UPLOADED });
        } else {
          await expect.element(editorScreen.settingsXImageInput()).toBeEnabled();
          await expect.element(editorScreen.settingsXImageUnsplashButton()).toBeEnabled();
          expect(saveApi.requests).toHaveLength(0);
        }
      }
    },
  );

  it('opens the pane over the section list and comes back from it', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    // The pane replaces the list it was opened from.
    await expect(editorScreen.settingsExcerpt()).toHaveCount(0);
    await expect.element(editorScreen.settingsXTitle()).toBeVisible();
    await expect.element(editorScreen.settingsXDescription()).toBeVisible();
    await expect.element(editorScreen.settingsXImage()).toBeVisible();

    await editorScreen.settingsSubviewBack(settingsXCardBackButton).click();

    await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
    await expect.element(editorScreen.settingsExcerpt()).toBeVisible();
    await expect.element(editorScreen.settingsSubviewRow(settingsXCardRow)).toBeVisible();
  });

  it('saves an uploaded X image as soon as it lands', async () => {
    const saveApi = fakeSavablePost();
    const uploadApi = fakeImageUpload();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await userEvent.upload(
      editorScreen.settingsXImageInput().element(),
      new File(['image'], 'hills.png', { type: 'image/png' }),
    );

    await expect.poll(() => uploadApi.requests.length, POLL).toBe(1);
    await expect(saveApi).toHaveSavedFields({ twitter_image: UPLOADED });
    await expect.element(editorScreen.removeSettingsXImage()).toBeVisible();
  });

  it('clears the X image the post already had', async () => {
    const saveApi = fakeSavablePost({ twitter_image: UPLOADED });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await editorScreen.removeSettingsXImage().click();

    await expect(saveApi).toHaveSavedFields({ twitter_image: null });
    await expect.element(editorScreen.settingsXImage()).toHaveTextContent('Add X image');
  });

  it('persists a draft’s X title and description on the blur that ends each edit', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await editorScreen.settingsXTitle().fill('A better title for X');
    await editorScreen.settingsXDescription().click();

    await expect(saveApi).toHaveSavedFields({ twitter_title: 'A better title for X' });
    expect(saveApi.requests).toHaveLength(1);

    await editorScreen.settingsXDescription().fill('What this post is about on X');
    await editorScreen.settingsXTitle().click();

    await expect(saveApi).toHaveSavedFields({
      twitter_description: 'What this post is about on X',
    });
    // The second field commit is its own save, not one coalesced with the first.
    expect(saveApi.requests).toHaveLength(2);
  });

  it('stages a published post’s X title until Update', async () => {
    const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await editorScreen.settingsXTitle().fill('A better title for X');
    await editorScreen.settingsXDescription().click();

    await expect.element(editorScreen.updateButton()).toBeEnabled();
    await expect.poll(unsavedChangesGuarded).toBe(true);
    expect(saveApi.requests).toHaveLength(0);

    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toMatchObject({
      twitter_title: 'A better title for X',
      status: 'published',
    });
  });

  it('stands in the post’s own title and excerpt until the X fields carry their own', async () => {
    fakeSavablePost({ custom_excerpt: 'The excerpt this post already has' });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await expect
      .element(editorScreen.settingsXTitle())
      .toHaveAttribute('placeholder', 'Hello from React');
    await expect
      .element(editorScreen.settingsXDescription())
      .toHaveAttribute('placeholder', 'The excerpt this post already has');

    const preview = editorScreen.settingsXPreview();
    await expect.element(preview).toHaveTextContent('test.com');
    await expect.element(preview).toHaveTextContent('Hello from React');
    await expect.element(preview).toHaveTextContent('The excerpt this post already has');

    await editorScreen.settingsXTitle().fill('A better title for X');
    await editorScreen.settingsXDescription().fill('What this post is about on X');

    await expect.element(preview).toHaveTextContent('A better title for X');
    await expect.element(preview).toHaveTextContent('What this post is about on X');
    await expect.element(preview).not.toHaveTextContent('The excerpt this post already has');
  });

  it('falls back to the excerpt the server generated for the post', async () => {
    fakeSavablePost({ excerpt: 'The first words of the post itself' });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await expect
      .element(editorScreen.settingsXDescription())
      .toHaveAttribute('placeholder', 'The first words of the post itself');
    await expect
      .element(editorScreen.settingsXPreview())
      .toHaveTextContent('The first words of the post itself');
  });

  it('falls back to the site’s own description for a post that has none', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await expect
      .element(editorScreen.settingsXDescription())
      .toHaveAttribute('placeholder', SITE_DESCRIPTION);
    await expect.element(editorScreen.settingsXPreview()).toHaveTextContent(SITE_DESCRIPTION);
  });

  it('previews the feature image the writer is looking at, and follows it as it changes', async () => {
    fakeSavablePost({ feature_image: FEATURE });
    fakeImageUpload();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    // The card falls back to it while the pane's own dropzone is still empty.
    await expect.element(editorScreen.settingsXPreviewImage()).toHaveAttribute('src', FEATURE);
    await expect.element(editorScreen.settingsXImageInput()).toBeInTheDocument();

    const pane = editorScreen.settingsSubviewPane().element();

    await editorScreen.removeFeatureImage().click();

    await expect(editorScreen.settingsXPreviewImage()).toHaveCount(0);

    await userEvent.upload(
      editorScreen.featureImageInput().element(),
      new File(['image'], 'coast.png', { type: 'image/png' }),
    );

    await expect.element(editorScreen.settingsXPreviewImage()).toHaveAttribute('src', UPLOADED);
    // The open pane followed the canvas rather than being rebuilt around it.
    expect(pane.isConnected).toBe(true);
  });

  it('stages a published post’s X image until Update', async () => {
    const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
    const uploadApi = fakeImageUpload();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await userEvent.upload(
      editorScreen.settingsXImageInput().element(),
      new File(['image'], 'hills.png', { type: 'image/png' }),
    );

    await expect.poll(() => uploadApi.requests.length, POLL).toBe(1);
    await expect.element(editorScreen.removeSettingsXImage()).toBeVisible();
    await expect.poll(unsavedChangesGuarded).toBe(true);
    expect(saveApi.requests).toHaveLength(0);

    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toMatchObject({
      twitter_image: UPLOADED,
      status: 'published',
    });
  });

  it('reports an upload the server refuses and leaves the field as it was', async () => {
    const saveApi = fakeSavablePost();
    const uploadApi = fakeAdminEndpoint('POST', '/images/upload/', { errors: [] }, { status: 415 });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await userEvent.upload(
      editorScreen.settingsXImageInput().element(),
      new File(['image'], 'notes.txt', { type: 'image/png' }),
    );

    await expect.poll(() => uploadApi.requests.length, POLL).toBe(1);
    await expect
      .element(page.getByText('The image type you uploaded is not supported.', { exact: false }))
      .toBeVisible();
    await expect.element(editorScreen.settingsXImage()).toHaveTextContent('Add X image');
    expect(saveApi.requests).toHaveLength(0);
  });

  it('reports a malformed upload response without saving its image value', async () => {
    const saveApi = fakeSavablePost();
    fakeAdminEndpoint('POST', '/images/upload/', { images: [{ url: 123, ref: null }] });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await userEvent.upload(
      editorScreen.settingsXImageInput().element(),
      new File(['image'], 'hills.png', { type: 'image/png' }),
    );

    await expect.element(page.getByText('Couldn’t upload the X image.')).toBeVisible();
    await expect.element(editorScreen.settingsXImage()).toHaveTextContent('Add X image');
    expect(saveApi.requests).toHaveLength(0);
  });

  it('falls back to the meta fields where the post has none of its own', async () => {
    fakeSavablePost({
      title: '',
      meta_title: 'In search results',
      meta_description: 'What search engines are told',
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await expect
      .element(editorScreen.settingsXTitle())
      .toHaveAttribute('placeholder', 'In search results');
    await expect
      .element(editorScreen.settingsXDescription())
      .toHaveAttribute('placeholder', 'What search engines are told');
  });

  it('refuses to save an X title longer than the field holds', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await editorScreen.settingsXTitle().fill('a'.repeat(301));
    await editorScreen.settingsXDescription().click();

    await expect
      .element(editorScreen.settingsSubviewPane().getByRole('alert'))
      .toHaveTextContent('X title cannot be longer than 300 characters.');
    await expect.element(editorScreen.settingsXTitle()).toHaveAttribute('aria-invalid', 'true');
    // Refused where the writer is typing rather than as a save they did not ask for.
    await expect.poll(unsavedChangesGuarded).toBe(true);
    await expect(editorScreen.saveErrorBanner()).toHaveCount(0);
    expect(saveApi.requests).toHaveLength(0);

    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect
      .element(editorScreen.saveErrorBanner())
      .toHaveTextContent('X title cannot be longer than 300 characters.');
    expect(saveApi.requests).toHaveLength(0);
  });

  it('refuses to save an X description longer than the field holds', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await editorScreen.settingsXDescription().fill('a'.repeat(501));
    await editorScreen.settingsXTitle().click();

    await expect
      .element(editorScreen.settingsSubviewPane().getByRole('alert'))
      .toHaveTextContent('X description cannot be longer than 500 characters.');
    await expect
      .element(editorScreen.settingsXDescription())
      .toHaveAttribute('aria-invalid', 'true');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    expect(saveApi.requests).toHaveLength(0);

    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect
      .element(editorScreen.saveErrorBanner())
      .toHaveTextContent('X description cannot be longer than 500 characters.');
    expect(saveApi.requests).toHaveLength(0);
  });

  it('gives a contributor the pane their role can write', async () => {
    // A contributor may only open a draft they authored.
    const saveApi = fakeSavablePost({ authors: [{ id: CURRENT_USER_ID }] });
    await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));
    await openXCard();

    await editorScreen.settingsXTitle().fill('A contributor’s X title');
    await editorScreen.settingsXDescription().click();

    await expect
      .poll(() => submittedPost(saveApi).twitter_title, POLL)
      .toBe('A contributor’s X title');
  });

  it('offers Unsplash on an empty X image field', async () => {
    fakeSavablePost();
    fakeUnsplashPhotos();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await editorScreen.settingsXImageUnsplashButton().click();

    await expect.element(editorScreen.unsplashModal()).toBeVisible();
  });

  it('leaves Unsplash out while the site’s integration is off', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, { ...FLAG_ON, ...withoutUnsplash() });
    await openXCard();

    await expect.element(editorScreen.settingsXImageInput()).toBeInTheDocument();
    await expect(editorScreen.settingsXImageUnsplashButton()).toHaveCount(0);
  });

  it('saves an X image picked from Unsplash as soon as it lands', async () => {
    const saveApi = fakeSavablePost();
    fakeUnsplashPhotos();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await editorScreen.settingsXImageUnsplashButton().click();
    await editorScreen.unsplashInsertImage().click();

    await expect(saveApi).toHaveSavedFields({ twitter_image: UNSPLASH_PICKED });
    await expect.element(editorScreen.removeSettingsXImage()).toBeVisible();
    await expect(editorScreen.unsplashModal()).toHaveCount(0);
  });

  it('keeps keyboard navigation inside Unsplash and restores focus after Escape', async () => {
    fakeSavablePost();
    fakeUnsplashPhotos();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await editorScreen.settingsXImageUnsplashButton().click();
    await expect.element(editorScreen.unsplashSearchInput()).toHaveFocus();
    await expect.element(editorScreen.unsplashInsertImage()).toBeVisible();

    // Back past the close button: focus must wrap inside the search rather
    // than reaching the picker button in the pane behind it.
    await userEvent.keyboard('{Shift>}{Tab}{Tab}{/Shift}');
    expect(editorScreen.unsplashSearch().element().contains(document.activeElement)).toBe(true);

    // Traverse past the close button, search field and one photo's links.
    // Every stop stays inside, including the forward wrap.
    for (let i = 0; i < 6; i++) {
      await userEvent.keyboard('{Tab}');
      expect(editorScreen.unsplashSearch().element().contains(document.activeElement)).toBe(true);
    }
    await userEvent.keyboard('{Escape}');

    await expect(editorScreen.unsplashModal()).toHaveCount(0);
    await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
    await expect.element(editorScreen.settingsXImageUnsplashButton()).toHaveFocus();
  });

  it('keeps the pane open when Escape dismisses the Unsplash search', async () => {
    fakeSavablePost();
    fakeUnsplashPhotos();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openXCard();

    await editorScreen.settingsXImageUnsplashButton().click();
    await expect.element(editorScreen.unsplashModal()).toBeVisible();

    await userEvent.keyboard('{Escape}');

    await expect(editorScreen.unsplashModal()).toHaveCount(0);
    await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
    await expect.element(editorScreen.settingsXTitle()).toBeVisible();
  });
});
