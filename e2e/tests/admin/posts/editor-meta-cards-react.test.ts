import { PostEditorPage } from '@/admin-pages';
import { PostFactory, buildLexicalParagraph, createPostFactory } from '@/data-factory';
import { PostPage } from '@/helpers/pages';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';
import { writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

/**
 * The Meta data, X card and Facebook card sections of the React post editor's
 * settings sidebar, behind the `editorReact` Labs flag. Each case edits a
 * published post, saves with Update, and follows the values the whole way
 * round: what the server holds, and what the site writes into the page head
 * for search engines and for each network's card. Which head tags carry the
 * values, and what a removed card image falls back to, is only observable
 * against a real Ghost.
 */

const POSTS_API = '/ghost/api/admin/posts/';
const IMAGES_API = '/ghost/api/admin/images/upload/';

/** A 1x1 PNG, which Ghost accepts as an image upload. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

interface PostMeta {
  meta_title: string | null;
  meta_description: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  feature_image: string | null;
}

async function readPostMeta(page: Page, postId: string): Promise<PostMeta> {
  const response = await page.request.get(`${POSTS_API}${postId}/`);
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  return {
    meta_title: post.meta_title,
    meta_description: post.meta_description,
    twitter_title: post.twitter_title,
    twitter_description: post.twitter_description,
    twitter_image: post.twitter_image,
    og_title: post.og_title,
    og_description: post.og_description,
    og_image: post.og_image,
    feature_image: post.feature_image,
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

function waitForImageUpload(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes(IMAGES_API) &&
      response.status() === 201,
  );
}

/** Writes the fixture into the test's output dir under `name`, which Ghost keeps as the stored name. */
function imageFile(name: string): string {
  const filePath = test.info().outputPath(name);
  writeFileSync(filePath, PNG_1X1);
  return filePath;
}

/** Uploads through the API, for an image the post should start out with. */
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

/** The API and the head both carry absolute image URLs, so only the file name is fixed. */
function storedAs(name: string): RegExp {
  return new RegExp(`/${name.replace(/\./g, '\\.')}$`);
}

test.describe('Ghost Admin - Post editor meta data and social cards (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved.
  test.use({ labs: { editorReact: true } });

  let postFactory: PostFactory;

  test.beforeEach(async ({ page }) => {
    postFactory = createPostFactory(page.request);
  });

  test('published post - meta title and description reach the page head once updated', async ({
    browser,
    baseURL,
    page,
  }) => {
    const stamp = Date.now();
    const title = `react-meta-${stamp}`;
    const metaTitle = `Search title ${stamp}`;
    const metaDescription = `The description search engines read for ${stamp}.`;
    const created = await postFactory.create({
      title,
      status: 'published',
      lexical: buildLexicalParagraph('A paragraph the meta data stands in for.'),
    });

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { settings } = editor;

    await settings.openSection('meta-data');
    await settings.metaData.setTitle(metaTitle);
    await settings.metaData.setDescription(metaDescription);
    await expect(settings.metaData.searchPreview).toContainText(metaTitle);
    await expect(settings.metaData.searchPreview).toContainText(metaDescription);
    await settings.closeSection('meta-data');
    // A published post stages a settings edit until Update, so this click is
    // the only save
    await Promise.all([waitForPostSave(page, created.id), editor.header.updateButton.click()]);

    expect(await readPostMeta(page, created.id)).toMatchObject({
      meta_title: metaTitle,
      meta_description: metaDescription,
    });

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(created.slug);
      await expect(sitePost.articleTitle).toHaveText(title);
      await expect(visitorPage).toHaveTitle(metaTitle);
      await expect(sitePost.metaDescription).toHaveAttribute('content', metaDescription);
    });
  });

  test('published post - X and Facebook cards reach the page head, and a removed X image falls back to the feature image', async ({
    browser,
    baseURL,
    page,
  }) => {
    const stamp = Date.now();
    const title = `react-cards-${stamp}`;
    const featureImageName = `feature-${stamp}.png`;
    const xImageName = `x-card-${stamp}.png`;
    const facebookImageName = `facebook-card-${stamp}.png`;
    const xTitle = `X title ${stamp}`;
    const xDescription = `The description X shows for ${stamp}.`;
    const facebookTitle = `Facebook title ${stamp}`;
    const facebookDescription = `The description Facebook shows for ${stamp}.`;
    const created = await postFactory.create({
      title,
      status: 'published',
      feature_image: await uploadImage(page, featureImageName),
      lexical: buildLexicalParagraph('A paragraph the cards stand in for.'),
    });

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { settings } = editor;

    await settings.openSection('x-card');
    await settings.xCard.setTitle(xTitle);
    await settings.xCard.setDescription(xDescription);
    await Promise.all([
      waitForImageUpload(page),
      settings.xCard.uploadImage(imageFile(xImageName)),
    ]);
    await expect(settings.xCard.removeImageButton).toBeVisible();
    await expect(settings.xCard.previewImage).toHaveAttribute('src', storedAs(xImageName));
    await settings.closeSection('x-card');

    await settings.openSection('facebook-card');
    await settings.facebookCard.setTitle(facebookTitle);
    await settings.facebookCard.setDescription(facebookDescription);
    await Promise.all([
      waitForImageUpload(page),
      settings.facebookCard.uploadImage(imageFile(facebookImageName)),
    ]);
    await expect(settings.facebookCard.removeImageButton).toBeVisible();
    await expect(settings.facebookCard.previewImage).toHaveAttribute(
      'src',
      storedAs(facebookImageName),
    );
    await settings.closeSection('facebook-card');

    // Both cards are staged until Update, so this click is the only save
    await Promise.all([waitForPostSave(page, created.id), editor.header.updateButton.click()]);

    const saved = await readPostMeta(page, created.id);
    expect(saved).toMatchObject({
      twitter_title: xTitle,
      twitter_description: xDescription,
      og_title: facebookTitle,
      og_description: facebookDescription,
    });
    expect(saved.twitter_image).toMatch(storedAs(xImageName));
    expect(saved.og_image).toMatch(storedAs(facebookImageName));

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(created.slug);
      await expect(sitePost.articleTitle).toHaveText(title);
      await expect(sitePost.socialMetaTag('og:title')).toHaveAttribute('content', facebookTitle);
      await expect(sitePost.socialMetaTag('og:description')).toHaveAttribute(
        'content',
        facebookDescription,
      );
      await expect(sitePost.socialMetaTag('og:image')).toHaveAttribute(
        'content',
        storedAs(facebookImageName),
      );
      await expect(sitePost.socialMetaTag('twitter:title')).toHaveAttribute('content', xTitle);
      await expect(sitePost.socialMetaTag('twitter:description')).toHaveAttribute(
        'content',
        xDescription,
      );
      await expect(sitePost.socialMetaTag('twitter:image')).toHaveAttribute(
        'content',
        storedAs(xImageName),
      );
    });

    await settings.openSection('x-card');
    await settings.xCard.removeImageButton.click();
    await expect(settings.xCard.removeImageButton).toBeHidden();
    // The preview falls back to the feature image as soon as the card's own is gone
    await expect(settings.xCard.previewImage).toHaveAttribute('src', storedAs(featureImageName));
    await settings.closeSection('x-card');
    await Promise.all([waitForPostSave(page, created.id), editor.header.updateButton.click()]);

    const removed = await readPostMeta(page, created.id);
    expect(removed.twitter_image).toBeNull();
    expect(removed.og_image).toMatch(storedAs(facebookImageName));
    expect(removed.feature_image).toMatch(storedAs(featureImageName));

    // With no X image of its own the post's card takes the feature image, so
    // the tag stays and the Facebook card keeps its own
    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(created.slug);
      await expect(sitePost.socialMetaTag('twitter:image')).toHaveAttribute(
        'content',
        storedAs(featureImageName),
      );
      await expect(sitePost.socialMetaTag('og:image')).toHaveAttribute(
        'content',
        storedAs(facebookImageName),
      );
    });
  });
});
