import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

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
  withoutUnsplash,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const CURRENT_USER_ID = '1';
const FLAG_ON = { labs: { editorReact: true } };
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const BACK_LABEL = 'Close Facebook card panel';
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
    og_image: null,
    og_title: null,
    og_description: null,
    feature_image: null,
    tags: [],
    ...overrides,
  });
}

async function openFacebookCard() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await editorScreen.settingsSubviewRow('Facebook card').click();
  await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
}

/**
 * The sidebar's Facebook card pane: the image, title and description Facebook
 * is given instead of the post's own, and the card they produce.
 */
describe('Post settings Facebook card', () => {
  it(
    'opens the pane over the section list and comes back from it',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openFacebookCard();

      // The pane replaces the list it was opened from.
      await expect(editorScreen.settingsExcerpt()).toHaveCount(0);
      await expect.element(editorScreen.settingsFacebookTitle()).toBeVisible();
      await expect
        .element(editorScreen.settingsSidebar())
        .toHaveAttribute('aria-label', 'Facebook card');

      await editorScreen.settingsSubviewBack(BACK_LABEL).click();

      await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
      await expect.element(editorScreen.settingsExcerpt()).toBeVisible();
      await expect.element(editorScreen.settingsSubviewRow('Facebook card')).toBeVisible();
    },
    SLOW,
  );

  it(
    'saves an uploaded Facebook image as soon as it lands',
    async () => {
      const saveApi = fakeSavablePost();
      const uploadApi = fakeAdminEndpoint('POST', '/images/upload/', {
        images: [{ url: UPLOADED, ref: null }],
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openFacebookCard();

      await userEvent.upload(
        editorScreen.settingsFacebookImageInput().element(),
        new File(['image'], 'hills.png', { type: 'image/png' }),
      );

      await expect.poll(() => uploadApi.requests.length, POLL).toBe(1);
      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ og_image: UPLOADED });
      await expect.element(editorScreen.removeSettingsFacebookImage()).toBeVisible();
    },
    SLOW,
  );

  it(
    'clears the Facebook image the writer removes',
    async () => {
      const saveApi = fakeSavablePost({ og_image: UPLOADED });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openFacebookCard();

      await editorScreen.removeSettingsFacebookImage().click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ og_image: null });
      await expect.element(editorScreen.settingsFacebookImageInput()).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'persists a draft’s Facebook title and description on the blur that ends each edit',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openFacebookCard();

      await editorScreen.settingsFacebookTitle().fill('A better title for Facebook');
      await editorScreen.settingsFacebookDescription().click();

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ og_title: 'A better title for Facebook' });

      await editorScreen.settingsFacebookDescription().fill('What this post is about');
      await editorScreen.settingsFacebookTitle().click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(2);
      expect(submittedPost(saveApi)).toMatchObject({
        og_description: 'What this post is about',
      });
    },
    SLOW,
  );

  it(
    'stages a published post’s Facebook title until Update',
    async () => {
      const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openFacebookCard();

      await editorScreen.settingsFacebookTitle().fill('A better title for Facebook');
      await editorScreen.settingsFacebookDescription().click();

      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        og_title: 'A better title for Facebook',
        status: 'published',
      });
    },
    SLOW,
  );

  it(
    'offers the post’s own title and excerpt until the Facebook fields carry their own',
    async () => {
      fakeSavablePost({ custom_excerpt: 'The excerpt this post already has' });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openFacebookCard();

      await expect
        .element(editorScreen.settingsFacebookTitle())
        .toHaveAttribute('placeholder', 'Hello from React');
      await expect
        .element(editorScreen.settingsFacebookDescription())
        .toHaveAttribute('placeholder', 'The excerpt this post already has');

      const preview = editorScreen.settingsFacebookPreview();
      await expect.element(preview).toHaveTextContent('test.com');
      await expect.element(preview).toHaveTextContent('Hello from React');
      await expect.element(preview).toHaveTextContent('The excerpt this post already has');

      await editorScreen.settingsFacebookTitle().fill('A better title for Facebook');
      await editorScreen.settingsFacebookDescription().fill('What this post is about');

      await expect.element(preview).toHaveTextContent('A better title for Facebook');
      await expect.element(preview).toHaveTextContent('What this post is about');
      await expect.element(preview).not.toHaveTextContent('The excerpt this post already has');
    },
    SLOW,
  );

  it(
    'previews the feature image the writer is looking at, and follows it as it changes',
    async () => {
      fakeSavablePost({ feature_image: FEATURE });
      fakeAdminEndpoint('POST', '/images/upload/', { images: [{ url: UPLOADED, ref: null }] });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openFacebookCard();

      // The card falls back to it while the pane's own dropzone is still empty.
      await expect
        .element(editorScreen.settingsFacebookPreviewImage())
        .toHaveAttribute('src', FEATURE);
      await expect.element(editorScreen.settingsFacebookImageInput()).toBeInTheDocument();

      const pane = editorScreen.settingsSubviewPane().element();

      await editorScreen.removeFeatureImage().click();

      await expect(editorScreen.settingsFacebookPreviewImage()).toHaveCount(0);

      await userEvent.upload(
        editorScreen.featureImageInput().element(),
        new File(['image'], 'coast.png', { type: 'image/png' }),
      );

      await expect
        .element(editorScreen.settingsFacebookPreviewImage())
        .toHaveAttribute('src', UPLOADED);
      // The open pane followed the canvas rather than being rebuilt around it.
      expect(pane.isConnected).toBe(true);
    },
    SLOW,
  );

  it(
    'falls back to the site’s own description for a post that has none',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openFacebookCard();

      await expect
        .element(editorScreen.settingsFacebookDescription())
        .toHaveAttribute('placeholder', SITE_DESCRIPTION);
      await expect
        .element(editorScreen.settingsFacebookPreview())
        .toHaveTextContent(SITE_DESCRIPTION);
    },
    SLOW,
  );

  it(
    'refuses to save a Facebook title longer than the field holds',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openFacebookCard();

      await editorScreen.settingsFacebookTitle().fill('a'.repeat(301));
      await editorScreen.settingsFacebookDescription().click();

      await expect
        .element(editorScreen.settingsSubviewPane().getByRole('alert'))
        .toHaveTextContent('Facebook Title cannot be longer than 300 characters.');
      await expect
        .element(editorScreen.settingsFacebookTitle())
        .toHaveAttribute('aria-invalid', 'true');
      // Refused where the writer is typing rather than as a save they did not ask for.
      await expect.poll(unsavedChangesGuarded).toBe(true);
      await expect(editorScreen.saveErrorBanner()).toHaveCount(0);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect
        .element(editorScreen.saveErrorBanner())
        .toHaveTextContent('Facebook Title cannot be longer than 300 characters.');
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
      await openFacebookCard();

      await editorScreen.settingsFacebookTitle().fill('A contributor’s Facebook title');
      await editorScreen.settingsFacebookDescription().click();

      await expect
        .poll(() => submittedPost(saveApi).og_title, FIELD_POLL)
        .toBe('A contributor’s Facebook title');
    },
    SLOW,
  );

  it(
    'offers Unsplash on an empty Facebook image field',
    async () => {
      fakeSavablePost();
      fakeUnsplashPhotos();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openFacebookCard();

      await editorScreen.settingsFacebookImageUnsplashButton().click();

      await expect.element(editorScreen.unsplashModal()).toBeVisible();
    },
    SLOW,
  );

  it(
    'leaves Unsplash out while the site’s integration is off',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, { ...FLAG_ON, ...withoutUnsplash() });
      await openFacebookCard();

      await expect.element(editorScreen.settingsFacebookImageInput()).toBeInTheDocument();
      await expect(editorScreen.settingsFacebookImageUnsplashButton()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'saves a Facebook image picked from Unsplash as soon as it lands',
    async () => {
      const saveApi = fakeSavablePost();
      fakeUnsplashPhotos();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openFacebookCard();

      await editorScreen.settingsFacebookImageUnsplashButton().click();
      await editorScreen.unsplashInsertImage().click();

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ og_image: UNSPLASH_PICKED });
      await expect.element(editorScreen.removeSettingsFacebookImage()).toBeVisible();
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
      await openFacebookCard();

      await editorScreen.settingsFacebookImageUnsplashButton().click();
      await expect.element(editorScreen.unsplashModal()).toBeVisible();

      await userEvent.keyboard('{Escape}');

      await expect(editorScreen.unsplashModal()).toHaveCount(0);
      await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
      await expect.element(editorScreen.settingsFacebookTitle()).toBeVisible();
    },
    SLOW,
  );
});
