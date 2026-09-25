import { EGRESS_MOCK_RESPONSE_HEADER } from '@/helpers/environment/constants';
import { PostEditorPage } from '@/admin-pages';
import { PostFactory, buildLexicalParagraph, createPostFactory } from '@/data-factory';
import { PostPage } from '@/helpers/pages';
import { SettingsService } from '@/helpers/services/settings/settings-service';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';
import type { Page } from '@playwright/test';

/**
 * The feature image's Unsplash picker in the React post editor, behind the
 * `editorReact` Labs flag. Unsplash itself is stubbed at the network edge, so
 * what is under test is everything around it: the `unsplash` setting gating
 * the button, the picker handing the editor a photo, the editor storing that
 * photo's URL and credit on the post without an upload, and the site rendering
 * them once published. Which URL Ghost stores and what the theme does with it
 * are only observable against a real Ghost.
 */

const POSTS_API = '/ghost/api/admin/posts/';
const IMAGES_API = '/ghost/api/admin/images/upload/';
const UNSPLASH_API = 'https://api.unsplash.com';

/** A 1x1 PNG, which Ghost accepts as an image upload. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

interface UnsplashPhoto {
  id: string;
  alt: string;
  /** The URL the picker hands the editor, as `urls.regular`. */
  url: string;
  photographer: string;
  photographerUrl: string;
}

interface FeatureImageFields {
  status: string;
  slug: string;
  feature_image: string | null;
  feature_image_alt: string | null;
  feature_image_caption: string | null;
}

async function readFeatureImage(page: Page, postId: string): Promise<FeatureImageFields> {
  const response = await page.request.get(`${POSTS_API}${postId}/`);
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  return {
    status: post.status,
    slug: post.slug,
    feature_image: post.feature_image,
    feature_image_alt: post.feature_image_alt,
    feature_image_caption: post.feature_image_caption,
  };
}

function waitForPostSave(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.status() === 200,
  );
}

/** Uploads through the API and returns the absolute URL Ghost serves it from. */
async function uploadImage(page: Page, name: string): Promise<string> {
  const response = await page.request.post(IMAGES_API, {
    multipart: {
      file: { name, mimeType: 'image/png', buffer: PNG_1X1 },
      purpose: 'image',
    },
  });
  expect(response.status()).toBe(201);
  const {
    images: [image],
  } = await response.json();

  return image.url as string;
}

/** The API and the site both carry absolute image URLs, so only the file name is fixed. */
function storedAs(name: string): RegExp {
  return new RegExp(`/${name.replace(/\./g, '\\.')}$`);
}

/** A photo in the shape Unsplash's API returns, with every value the picker reads stamped. */
function unsplashPhotoResponse(photo: UnsplashPhoto) {
  return {
    id: photo.id,
    slug: photo.id,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    promoted_at: null,
    width: 1200,
    height: 800,
    color: '#f0f0f0',
    blur_hash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
    description: null,
    alt_description: photo.alt,
    breadcrumbs: [],
    urls: {
      raw: photo.url,
      full: photo.url,
      regular: photo.url,
      small: photo.url,
      thumb: photo.url,
    },
    links: {
      self: `${UNSPLASH_API}/photos/${photo.id}`,
      html: `https://unsplash.com/photos/${photo.id}`,
      download: `https://unsplash.com/photos/${photo.id}/download`,
      download_location: `${UNSPLASH_API}/photos/${photo.id}/download`,
    },
    likes: 1,
    liked_by_user: false,
    current_user_collections: [],
    sponsorship: null,
    topic_submissions: {},
    user: {
      id: `user-${photo.id}`,
      updated_at: '2026-01-01T00:00:00Z',
      username: photo.id,
      name: photo.photographer,
      first_name: photo.photographer,
      last_name: '',
      twitter_username: null,
      portfolio_url: null,
      bio: null,
      location: null,
      links: {
        self: `${UNSPLASH_API}/users/${photo.id}`,
        html: photo.photographerUrl,
        photos: `${UNSPLASH_API}/users/${photo.id}/photos`,
        likes: `${UNSPLASH_API}/users/${photo.id}/likes`,
        portfolio: `${UNSPLASH_API}/users/${photo.id}/portfolio`,
      },
      profile_image: { small: photo.url, medium: photo.url, large: photo.url },
      instagram_username: null,
      total_collections: 0,
      total_likes: 0,
      total_photos: 1,
      accepted_tos: true,
      for_hire: false,
      social: {
        instagram_username: null,
        portfolio_url: null,
        twitter_username: null,
        paypal_email: null,
      },
    },
  };
}

/**
 * Sets the site's `unsplash` setting and reloads the signed-in admin: the app
 * caches settings for its session, and the editor's hash route keeps the app.
 */
async function setUnsplashEnabled(page: Page, enabled: boolean): Promise<void> {
  const response = await new SettingsService(page.request).updateSettings([
    { key: 'unsplash', value: enabled },
  ]);
  expect(response.settings.find((setting) => setting.key === 'unsplash')?.value).toBe(enabled);
  await page.reload({ waitUntil: 'load' });
}

/**
 * Answers the picker's Unsplash API calls with `photo` alone and aborts every
 * other request to an Unsplash host, recording it, so nothing reaches Unsplash.
 * The photo's own URL is on the site under test: Ghost probes a remote feature
 * image's dimensions at render, which would send the server to Unsplash.
 */
async function stubUnsplash(page: Page, photo: UnsplashPhoto): Promise<{ escaped: string[] }> {
  const escaped: string[] = [];
  const body = unsplashPhotoResponse(photo);
  const responses: Record<string, unknown> = {
    '/photos': [body],
    '/search/photos': { results: [body] },
    [`/photos/${photo.id}/download`]: { url: photo.url },
  };

  await page.route(
    (url) => url.hostname === 'unsplash.com' || url.hostname.endsWith('.unsplash.com'),
    async (route) => {
      const url = new URL(route.request().url());
      const response = url.origin === UNSPLASH_API ? responses[url.pathname] : undefined;
      if (response === undefined) {
        escaped.push(url.toString());
        await route.abort();
        return;
      }
      await route.fulfill({
        body: JSON.stringify(response),
        contentType: 'application/json',
        headers: { [EGRESS_MOCK_RESPONSE_HEADER]: '1' },
      });
    },
  );

  return { escaped };
}

test.describe('Ghost Admin - Post editor feature image from Unsplash (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved.
  test.use({ labs: { editorReact: true } });

  let postFactory: PostFactory;

  test.beforeEach(async ({ page }) => {
    postFactory = createPostFactory(page.request);
  });

  test('draft post - the Unsplash button is absent while the integration is off', async ({
    page,
  }) => {
    await setUnsplashEnabled(page, false);
    const created = await postFactory.create({
      title: `react-unsplash-off-${Date.now()}`,
      status: 'draft',
      lexical: buildLexicalParagraph('A paragraph with no picker above it.'),
    });

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);

    await expect(editor.featureImage.root).toBeVisible();
    await expect(editor.featureImage.fileInput).toBeAttached();
    await expect(editor.featureImage.unsplashButton).toHaveCount(0);
  });

  test('draft post - a picked photo saves its URL and credit, takes alt text, and reaches the site once published', async ({
    browser,
    baseURL,
    page,
  }) => {
    const stamp = Date.now();
    const title = `react-unsplash-${stamp}`;
    const alt = `Alt text for the Unsplash pick ${stamp}`;
    const imageName = `unsplash-${stamp}.png`;
    const photo: UnsplashPhoto = {
      id: `e2e-${stamp}`,
      alt: `Stubbed Unsplash photo ${stamp}`,
      url: await uploadImage(page, imageName),
      photographer: `Photographer ${stamp}`,
      photographerUrl: `https://unsplash.com/@e2e-${stamp}`,
    };
    await setUnsplashEnabled(page, true);
    const created = await postFactory.create({
      title,
      status: 'draft',
      lexical: buildLexicalParagraph('A paragraph under the picked photo.'),
    });
    const { escaped } = await stubUnsplash(page, photo);

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { featureImage } = editor;

    // A draft saves the image the moment it is picked; the credit rides along as the caption
    await featureImage.openUnsplash();
    await Promise.all([
      waitForPostSave(page, created.id),
      featureImage.insertUnsplashPhoto(photo.alt),
    ]);
    await expect(featureImage.caption).toContainText(photo.photographer);
    await expect(featureImage.removeButton).toBeVisible();

    await Promise.all([waitForPostSave(page, created.id), featureImage.setAlt(alt)]);
    await expect(featureImage.root.getByRole('img', { name: alt })).toHaveAttribute(
      'src',
      photo.url,
    );

    // The picker's URL is stored as given: no upload stands between it and the post
    await expect
      .poll(() => readFeatureImage(page, created.id), { timeout: 15000 })
      .toMatchObject({
        status: 'draft',
        feature_image: expect.stringMatching(storedAs(imageName)),
        feature_image_alt: alt,
        feature_image_caption: expect.stringContaining(
          `<a href="${photo.photographerUrl}">${photo.photographer}</a>`,
        ),
      });

    await editor.publishFlow.open();
    await expect(editor.publishFlow.optionsStep).toBeVisible();
    await Promise.all([waitForPostSave(page, created.id), editor.publishFlow.confirm()]);
    await expect(editor.publishFlow.completeStep).toBeVisible();
    const published = await readFeatureImage(page, created.id);
    expect(published.status).toBe('published');

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const { escaped: escapedFromSite } = await stubUnsplash(visitorPage, photo);
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(published.slug);
      await expect(sitePost.articleTitle).toHaveText(title);
      await expect(visitorPage.getByRole('img', { name: alt })).toHaveAttribute(
        'src',
        storedAs(imageName),
      );
      await expect(
        visitorPage.getByRole('link', { name: photo.photographer, exact: true }),
      ).toHaveAttribute('href', photo.photographerUrl);
      expect(escapedFromSite).toEqual([]);
    });

    expect(escaped).toEqual([]);
  });
});
