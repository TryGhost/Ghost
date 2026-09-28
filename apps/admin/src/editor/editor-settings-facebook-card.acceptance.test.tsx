import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import {
  settingsFacebookCardBackButton,
  settingsFacebookCardRow,
} from '@tryghost/test-data/selectors/editor';

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
  await editorScreen.settingsSubviewRow(settingsFacebookCardRow).click();
  await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
}

/**
 * The sidebar's Facebook card pane: the image, title and description Facebook
 * is given instead of the post's own, and the card they produce.
 */
describe('Post settings Facebook card', () => {
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
      await openFacebookCard();

      try {
        await userEvent.upload(
          editorScreen.settingsFacebookImageInput().element(),
          new File(['image'], 'hills.png', { type: 'image/png' }),
        );
        await expect.poll(() => uploadApi.requests.length, POLL).toBe(1);
        await expect.element(editorScreen.settingsFacebookImageInput()).toBeDisabled();
        await editorScreen.settingsSubviewBack(settingsFacebookCardBackButton).click();
        await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
        await editorScreen.settingsSubviewRow(settingsFacebookCardRow).click();
        await expect.element(editorScreen.settingsSubviewPane()).toBeVisible();
        await expect.element(editorScreen.settingsFacebookImageInput()).toBeDisabled();
        await expect.element(editorScreen.settingsFacebookImageUnsplashButton()).toBeDisabled();
        expect(saveApi.requests).toHaveLength(0);
      } finally {
        pending.resolve();
        // Settle the held request even when an assertion fails.
        if (status === 200) {
          await expect(saveApi).toHaveSavedFields({ og_image: UPLOADED });
        } else {
          await expect.element(editorScreen.settingsFacebookImageInput()).toBeEnabled();
          await expect.element(editorScreen.settingsFacebookImageUnsplashButton()).toBeEnabled();
          expect(saveApi.requests).toHaveLength(0);
        }
      }
    },
  );

  it('opens the pane over the section list and comes back from it', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openFacebookCard();

    // The pane replaces the list it was opened from.
    await expect(editorScreen.settingsExcerpt()).toHaveCount(0);
    await expect.element(editorScreen.settingsFacebookTitle()).toBeVisible();
    await expect
      .element(editorScreen.settingsSidebar())
      .toHaveAttribute('aria-label', settingsFacebookCardRow);

    await editorScreen.settingsSubviewBack(settingsFacebookCardBackButton).click();

    await expect(editorScreen.settingsSubviewPane()).toHaveCount(0);
    await expect.element(editorScreen.settingsExcerpt()).toBeVisible();
    await expect.element(editorScreen.settingsSubviewRow(settingsFacebookCardRow)).toBeVisible();
  });

  it('saves an uploaded Facebook image as soon as it lands', async () => {
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
    await expect(saveApi).toHaveSavedFields({ og_image: UPLOADED });
    await expect.element(editorScreen.removeSettingsFacebookImage()).toBeVisible();
  });

  it('clears the Facebook image the writer removes', async () => {
    const saveApi = fakeSavablePost({ og_image: UPLOADED });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openFacebookCard();

    await editorScreen.removeSettingsFacebookImage().click();

    await expect(saveApi).toHaveSavedFields({ og_image: null });
    await expect.element(editorScreen.settingsFacebookImageInput()).toBeInTheDocument();
  });

  it('persists a draft’s Facebook title and description on the blur that ends each edit', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openFacebookCard();

    await editorScreen.settingsFacebookTitle().fill('A better title for Facebook');
    await editorScreen.settingsFacebookDescription().click();

    await expect(saveApi).toHaveSavedFields({ og_title: 'A better title for Facebook' });
    expect(saveApi.requests).toHaveLength(1);

    await editorScreen.settingsFacebookDescription().fill('What this post is about');
    await editorScreen.settingsFacebookTitle().click();

    await expect(saveApi).toHaveSavedFields({
      og_description: 'What this post is about',
    });
    // The second field commit is its own save, not one coalesced with the first.
    expect(saveApi.requests).toHaveLength(2);
  });

  it('stages a published post’s Facebook title until Update', async () => {
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
  });

  it('offers the post’s own title and excerpt until the Facebook fields carry their own', async () => {
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
  });

  it('previews the feature image the writer is looking at, and follows it as it changes', async () => {
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
  });

  it('falls back to the site’s own description for a post that has none', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openFacebookCard();

    await expect
      .element(editorScreen.settingsFacebookDescription())
      .toHaveAttribute('placeholder', SITE_DESCRIPTION);
    await expect
      .element(editorScreen.settingsFacebookPreview())
      .toHaveTextContent(SITE_DESCRIPTION);
  });

  it('refuses to save a Facebook title longer than the field holds', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openFacebookCard();

    await editorScreen.settingsFacebookTitle().fill('a'.repeat(301));
    await editorScreen.settingsFacebookDescription().click();

    await expect
      .element(editorScreen.settingsSubviewPane().getByRole('alert'))
      .toHaveTextContent('Facebook title cannot be longer than 300 characters.');
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
      .toHaveTextContent('Facebook title cannot be longer than 300 characters.');
    expect(saveApi.requests).toHaveLength(0);
  });

  it('gives a contributor the pane their role can write', async () => {
    // A contributor may only open a draft they authored.
    const saveApi = fakeSavablePost({ authors: [{ id: CURRENT_USER_ID }] });
    await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));
    await openFacebookCard();

    await editorScreen.settingsFacebookTitle().fill('A contributor’s Facebook title');
    await editorScreen.settingsFacebookDescription().click();

    await expect(saveApi).toHaveSavedFields({ og_title: 'A contributor’s Facebook title' });
  });

  it('offers Unsplash on an empty Facebook image field', async () => {
    fakeSavablePost();
    fakeUnsplashPhotos();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openFacebookCard();

    await editorScreen.settingsFacebookImageUnsplashButton().click();

    await expect.element(editorScreen.unsplashModal()).toBeVisible();
  });

  it('leaves Unsplash out while the site’s integration is off', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, { ...FLAG_ON, ...withoutUnsplash() });
    await openFacebookCard();

    await expect.element(editorScreen.settingsFacebookImageInput()).toBeInTheDocument();
    await expect(editorScreen.settingsFacebookImageUnsplashButton()).toHaveCount(0);
  });

  it('saves a Facebook image picked from Unsplash as soon as it lands', async () => {
    const saveApi = fakeSavablePost();
    fakeUnsplashPhotos();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openFacebookCard();

    await editorScreen.settingsFacebookImageUnsplashButton().click();
    await editorScreen.unsplashInsertImage().click();

    await expect(saveApi).toHaveSavedFields({ og_image: UNSPLASH_PICKED });
    await expect.element(editorScreen.removeSettingsFacebookImage()).toBeVisible();
    await expect(editorScreen.unsplashModal()).toHaveCount(0);
  });

  it('keeps the pane open when Escape dismisses the Unsplash search', async () => {
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
  });
});
