import { PostEditorPage, PostsPage } from '@/admin-pages';
import { PostFactory, buildLexicalParagraph, createPostFactory } from '@/data-factory';
import { PostPage } from '@/helpers/pages';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';
import type { Page } from '@playwright/test';

/**
 * The URL section of the React post editor's settings sidebar, behind the
 * `editorReact` Labs flag. A typed slug is not stored as typed: Ghost
 * normalises it and, when another post already owns it, appends a counter.
 * Each case follows the slug the whole way round: what the writer types, what
 * the field settles on, what the server holds, and which post each URL serves.
 * The value Ghost chooses is only observable against a real Ghost.
 */

const POSTS_API = '/ghost/api/admin/posts/';

async function readPost(page: Page, postId: string) {
  const response = await page.request.get(`${POSTS_API}${postId}/`);
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  return { status: post.status as string, slug: post.slug as string };
}

function waitForPostSave(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.status() === 200,
  );
}

/** Starts a new draft from the list and returns it once its first save has given it an id. */
async function startDraft(page: Page, { title, body }: { title: string; body: string }) {
  const postsPage = new PostsPage(page);
  await postsPage.goto();
  await postsPage.newPostButton.click();

  const editor = new PostEditorPage(page, { implementation: 'react' });
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes(POSTS_API) &&
        response.status() === 201,
    ),
    editor.createDraft({ title, body }),
  ]);

  return { editor, postId: await editor.getPostId() };
}

/** Renders `/slug/` as a visitor and returns the response status and the article title. */
async function renderPost(sitePost: PostPage, slug: string) {
  const response = await sitePost.goto(`/${slug}/`);
  await sitePost.waitForPostToLoad();

  return { status: response?.status(), title: await sitePost.articleTitle.textContent() };
}

test.describe('Ghost Admin - Post editor URL (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved.
  test.use({ labs: { editorReact: true } });

  let postFactory: PostFactory;

  test.beforeEach(async ({ page }) => {
    postFactory = createPostFactory(page.request);
  });

  test('new draft - a slug another post owns is deduped, and each URL serves its own post', async ({
    browser,
    baseURL,
    page,
  }) => {
    const stamp = Date.now();
    const title = `react-url-${stamp}`;
    const seededTitle = `Seeded URL ${stamp}`;
    const seeded = await postFactory.create({
      title: seededTitle,
      slug: `seeded-url-${stamp}`,
      status: 'published',
      lexical: buildLexicalParagraph('The post that owns the slug.'),
    });
    const dedupedSlug = `${seeded.slug}-2`;

    const { editor, postId } = await startDraft(page, {
      title,
      body: 'The post that asks for a taken slug.',
    });
    const { settings } = editor;

    // A new draft's slug follows its title until the writer types one
    await settings.openSection('url');
    await expect(settings.url.slugInput).toHaveValue(title);

    // A draft saves the slug as soon as it is committed, so the blur is the save
    await Promise.all([waitForPostSave(page, postId), settings.url.setSlug(seeded.slug)]);
    await expect(settings.url.slugInput).toHaveValue(dedupedSlug);
    await expect(settings.url.preview).toContainText(`/${dedupedSlug}/`);
    expect(await readPost(page, postId)).toEqual({ status: 'draft', slug: dedupedSlug });

    await editor.publishFlow.open();
    await expect(editor.publishFlow.optionsStep).toBeVisible();
    await Promise.all([waitForPostSave(page, postId), editor.publishFlow.confirm()]);
    await expect(editor.publishFlow.completeStep).toBeVisible();
    expect(await readPost(page, postId)).toEqual({ status: 'published', slug: dedupedSlug });

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const sitePost = new PostPage(visitorPage);
      expect(await renderPost(sitePost, dedupedSlug)).toEqual({ status: 200, title });
      expect(await renderPost(sitePost, seeded.slug)).toEqual({ status: 200, title: seededTitle });
    });
  });

  test('new draft - a typed slug with spaces and capitals saves normalised', async ({ page }) => {
    const stamp = Date.now();
    const title = `react-url-normalise-${stamp}`;
    const normalisedSlug = `custom-slug-${stamp}`;

    const { editor, postId } = await startDraft(page, {
      title,
      body: 'The post whose slug is typed with spaces and capitals.',
    });
    const { settings } = editor;

    await settings.openSection('url');
    await expect(settings.url.slugInput).toHaveValue(title);

    await Promise.all([
      waitForPostSave(page, postId),
      settings.url.setSlug(`Custom Slug ${stamp}`),
    ]);
    await expect(settings.url.slugInput).toHaveValue(normalisedSlug);
    await expect(settings.url.preview).toContainText(`/${normalisedSlug}/`);
    expect(await readPost(page, postId)).toEqual({ status: 'draft', slug: normalisedSlug });
  });
});
