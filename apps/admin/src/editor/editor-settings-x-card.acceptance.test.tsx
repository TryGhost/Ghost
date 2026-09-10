import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeEndpoint,
  fakeTiers,
  post,
  renderAdminApp,
  settingsResponse,
  staffRole,
  submittedPost,
  unsavedChangesGuarded,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const CURRENT_USER_ID = '1';
const FLAG_ON = { labs: { editorReact: true } };
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const BACK_LABEL = 'Close X card panel';
const UPLOADED = 'https://example.com/content/images/2026/09/hills.png';
const FEATURE = 'https://example.com/content/images/2026/09/coast.png';
// The site fixture's own description, which the card falls back to last.
const SITE_DESCRIPTION = 'Thoughts, stories and ideas.';

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

const UNSPLASH_REGULAR = 'https://images.unsplash.com/photo-1?ixid=1&w=1080';
// The picker asks Unsplash for a wider rendition of the image it inserts.
const UNSPLASH_PICKED = 'https://images.unsplash.com/photo-1?ixid=1&w=2000';

/** One Unsplash photo, in the shape the search modal lays out and inserts. */
function fakeUnsplashPhotos() {
  fakeEndpoint('GET', 'https://api.unsplash.com/photos', [
    {
      id: 'photo-1',
      color: '#123456',
      alt_description: 'A hillside',
      height: 800,
      width: 1200,
      likes: 12,
      urls: { regular: UNSPLASH_REGULAR },
      links: {
        html: 'https://unsplash.com/photos/photo-1',
        download: 'https://unsplash.com/photos/photo-1/download',
        download_location: 'https://api.unsplash.com/photos/photo-1/download',
      },
      user: {
        name: 'A Photographer',
        links: { html: 'https://unsplash.com/@photographer' },
        profile_image: { medium: 'https://images.unsplash.com/profile-1' },
      },
    },
  ]);
  fakeEndpoint('GET', 'https://api.unsplash.com/photos/photo-1/download', {});
}

/** The site fixture turns Unsplash on, so only the off case needs an override. */
function withoutUnsplash() {
  return {
    ...FLAG_ON,
    boot: { browseSettings: { response: settingsResponse({ settings: { unsplash: false } }) } },
  };
}

async function openXCard() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await editorScreen.settingsSubviewRow('X card').click();
  await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
}

/**
 * The sidebar's X card pane: the image, title and description X is given
 * instead of the post's own.
 */
describe('Post settings X card', () => {
  it(
    'opens the pane over the section list and comes back from it',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openXCard();

      // The pane replaces the list it was opened from.
      await expect(editorScreen.settingsExcerpt()).toHaveCount(0);
      await expect.element(editorScreen.settingsXTitle()).toBeVisible();
      await expect.element(editorScreen.settingsXDescription()).toBeVisible();
      await expect.element(editorScreen.settingsXImage()).toBeVisible();

      await editorScreen.settingsSubviewBack(BACK_LABEL).click();

      await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
      await expect.element(editorScreen.settingsExcerpt()).toBeVisible();
      await expect.element(editorScreen.settingsSubviewRow('X card')).toBeVisible();
    },
    SLOW,
  );

  it(
    'saves an uploaded X image as soon as it lands',
    async () => {
      const saveApi = fakeSavablePost();
      const uploadApi = fakeImageUpload();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openXCard();

      await userEvent.upload(
        editorScreen.settingsXImageInput().element(),
        new File(['image'], 'hills.png', { type: 'image/png' }),
      );

      await expect.poll(() => uploadApi.requests.length, POLL).toBe(1);
      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ twitter_image: UPLOADED });
      await expect.element(editorScreen.removeSettingsXImage()).toBeVisible();
    },
    SLOW,
  );

  it(
    'clears the X image the post already had',
    async () => {
      const saveApi = fakeSavablePost({ twitter_image: UPLOADED });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openXCard();

      await editorScreen.removeSettingsXImage().click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi).twitter_image).toBeNull();
      await expect.element(editorScreen.settingsXImage()).toHaveTextContent('Add X image');
    },
    SLOW,
  );

  it(
    'persists a draft’s X title and description on the blur that ends each edit',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openXCard();

      await editorScreen.settingsXTitle().fill('A better title for X');
      await editorScreen.settingsXDescription().click();

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ twitter_title: 'A better title for X' });

      await editorScreen.settingsXDescription().fill('What this post is about on X');
      await editorScreen.settingsXTitle().click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(2);
      expect(submittedPost(saveApi)).toMatchObject({
        twitter_description: 'What this post is about on X',
      });
    },
    SLOW,
  );

  it(
    'stages a published post’s X title until Update',
    async () => {
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
    },
    SLOW,
  );

  it(
    'stands in the post’s own title and excerpt until the X fields carry their own',
    async () => {
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
    },
    SLOW,
  );

  it(
    'falls back to the excerpt the server generated for the post',
    async () => {
      fakeSavablePost({ excerpt: 'The first words of the post itself' });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openXCard();

      await expect
        .element(editorScreen.settingsXDescription())
        .toHaveAttribute('placeholder', 'The first words of the post itself');
      await expect
        .element(editorScreen.settingsXPreview())
        .toHaveTextContent('The first words of the post itself');
    },
    SLOW,
  );

  it(
    'falls back to the site’s own description for a post that has none',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openXCard();

      await expect
        .element(editorScreen.settingsXDescription())
        .toHaveAttribute('placeholder', SITE_DESCRIPTION);
      await expect.element(editorScreen.settingsXPreview()).toHaveTextContent(SITE_DESCRIPTION);
    },
    SLOW,
  );

  it(
    'previews the feature image the writer is looking at, and follows it as it changes',
    async () => {
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
    },
    SLOW,
  );

  it(
    'stages a published post’s X image until Update',
    async () => {
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
    },
    SLOW,
  );

  it(
    'reports an upload the server refuses and leaves the field as it was',
    async () => {
      const saveApi = fakeSavablePost();
      const uploadApi = fakeAdminEndpoint(
        'POST',
        '/images/upload/',
        { errors: [] },
        { status: 415 },
      );
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
    },
    SLOW,
  );

  it(
    'reports a malformed upload response without saving its image value',
    async () => {
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
    },
    SLOW,
  );

  it(
    'falls back to the meta fields where the post has none of its own',
    async () => {
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
    },
    SLOW,
  );

  it(
    'refuses to save an X title longer than the field holds',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openXCard();

      await editorScreen.settingsXTitle().fill('a'.repeat(301));
      await editorScreen.settingsXDescription().click();

      await expect
        .element(editorScreen.settingsSubviewPane().getByRole('alert'))
        .toHaveTextContent('Twitter Title cannot be longer than 300 characters.');
      await expect.element(editorScreen.settingsXTitle()).toHaveAttribute('aria-invalid', 'true');
      // Refused where the writer is typing rather than as a save they did not ask for.
      await expect.poll(unsavedChangesGuarded).toBe(true);
      await expect(editorScreen.saveErrorBanner()).toHaveCount(0);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect
        .element(editorScreen.saveErrorBanner())
        .toHaveTextContent('Twitter Title cannot be longer than 300 characters.');
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'refuses to save an X description longer than the field holds',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openXCard();

      await editorScreen.settingsXDescription().fill('a'.repeat(501));
      await editorScreen.settingsXTitle().click();

      await expect
        .element(editorScreen.settingsSubviewPane().getByRole('alert'))
        .toHaveTextContent('Twitter Description cannot be longer than 500 characters.');
      await expect
        .element(editorScreen.settingsXDescription())
        .toHaveAttribute('aria-invalid', 'true');
      await expect.poll(unsavedChangesGuarded).toBe(true);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect
        .element(editorScreen.saveErrorBanner())
        .toHaveTextContent('Twitter Description cannot be longer than 500 characters.');
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'gives a contributor the pane their role can write',
    async () => {
      // A contributor may only open a draft they authored.
      const saveApi = fakeSavablePost({ authors: [{ id: CURRENT_USER_ID }] });
      await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));
      await openXCard();

      await editorScreen.settingsXTitle().fill('A contributor’s X title');
      await editorScreen.settingsXDescription().click();

      await expect
        .poll(() => submittedPost(saveApi).twitter_title, POLL)
        .toBe('A contributor’s X title');
    },
    SLOW,
  );

  it(
    'offers Unsplash on an empty X image field',
    async () => {
      fakeSavablePost();
      fakeUnsplashPhotos();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openXCard();

      await editorScreen.settingsXImageUnsplashButton().click();

      await expect.element(editorScreen.unsplashModal()).toBeVisible();
    },
    SLOW,
  );

  it(
    'leaves Unsplash out while the site’s integration is off',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, withoutUnsplash());
      await openXCard();

      await expect.element(editorScreen.settingsXImageInput()).toBeInTheDocument();
      await expect(editorScreen.settingsXImageUnsplashButton()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'saves an X image picked from Unsplash as soon as it lands',
    async () => {
      const saveApi = fakeSavablePost();
      fakeUnsplashPhotos();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openXCard();

      await editorScreen.settingsXImageUnsplashButton().click();
      await editorScreen.unsplashInsertImage().click();

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ twitter_image: UNSPLASH_PICKED });
      await expect.element(editorScreen.removeSettingsXImage()).toBeVisible();
      await expect(editorScreen.unsplashModal()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'keeps the pane open when Escape dismisses the Unsplash search',
    async () => {
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
    },
    SLOW,
  );
});
