import { PostEditorPage } from '@/admin-pages';
import {
  PostFactory,
  TagFactory,
  buildLexicalParagraph,
  createPostFactory,
  createTagFactory,
} from '@/data-factory';
import { PostPage, PublicPage } from '@/helpers/pages';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';
import type { Page } from '@playwright/test';

/**
 * The Tags section of the React post editor's settings sidebar, behind the
 * `editorReact` Labs flag. Each case follows the tags the whole way round: what
 * the writer picks or types, what the server holds afterwards (the order, the
 * slug a typed name gets, the visibility a `#` name gets), and what the site
 * renders. A draft saves a tag as soon as it is picked; a published post stages
 * the change until Update. Which tag the theme shows and which reach the head
 * are only observable against a real Ghost.
 */

const POSTS_API = '/ghost/api/admin/posts/';
const TAGS_API = '/ghost/api/admin/tags/';

interface PostTag {
  name: string;
  slug: string;
  visibility: string;
}

async function readPostTags(page: Page, postId: string) {
  const response = await page.request.get(`${POSTS_API}${postId}/?include=tags`);
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  return {
    status: post.status as string,
    slug: post.slug as string,
    tags: (post.tags as PostTag[]).map(({ name, slug, visibility }) => ({
      name,
      slug,
      visibility,
    })),
  };
}

async function findTagBySlug(page: Page, slug: string): Promise<PostTag | undefined> {
  const response = await page.request.get(`${TAGS_API}?filter=slug:${slug}`);
  expect(response.status()).toBe(200);
  const { tags } = await response.json();

  return (tags as PostTag[])[0];
}

function waitForPostSave(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.status() === 200,
  );
}

/** The tag names the page head carries, in the order Ghost writes them. */
function headTagNames(sitePost: PostPage): Promise<(string | null)[]> {
  return sitePost.articleTagMetas.evaluateAll((metas) =>
    metas.map((meta) => meta.getAttribute('content')),
  );
}

/** Publishes the open draft and dismisses the flow so the sidebar is reachable again. */
async function publish(page: Page, editor: PostEditorPage, postId: string): Promise<void> {
  await editor.publishFlow.open();
  await expect(editor.publishFlow.optionsStep).toBeVisible();
  await Promise.all([waitForPostSave(page, postId), editor.publishFlow.confirm()]);
  await expect(editor.publishFlow.completeStep).toBeVisible();
  await editor.publishFlow.dismiss();
}

test.describe('Ghost Admin - Post editor tags (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved.
  test.use({ labs: { editorReact: true } });

  let postFactory: PostFactory;
  let tagFactory: TagFactory;

  test.beforeEach(async ({ page }) => {
    postFactory = createPostFactory(page.request);
    tagFactory = createTagFactory(page.request);
  });

  test('draft post - an existing and a typed tag save on pick, render in order once published, and the first survives removal', async ({
    browser,
    baseURL,
    page,
  }) => {
    const stamp = Date.now();
    const title = `react-tags-${stamp}`;
    const typedName = `Typed Tag ${stamp}`;
    const typedSlug = `typed-tag-${stamp}`;
    const [seeded, created] = await Promise.all([
      tagFactory.create({ name: `Seeded Tag ${stamp}` }),
      postFactory.create({
        title,
        status: 'draft',
        lexical: buildLexicalParagraph('A paragraph the tags file under.'),
      }),
    ]);

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { settings } = editor;

    // A draft saves a tag the moment it is picked, so each pick is its own PUT
    await settings.openSection('tags');
    await Promise.all([waitForPostSave(page, created.id), settings.tags.add(seeded.name)]);
    await Promise.all([waitForPostSave(page, created.id), settings.tags.add(typedName)]);
    await expect(settings.tags.tokens).toHaveText([seeded.name, typedName]);

    expect(await readPostTags(page, created.id)).toMatchObject({
      status: 'draft',
      tags: [
        { name: seeded.name, slug: seeded.slug, visibility: 'public' },
        { name: typedName, slug: typedSlug, visibility: 'public' },
      ],
    });
    // The typed name became a tag of its own, with the slug Ghost derives from it
    expect(await findTagBySlug(page, typedSlug)).toMatchObject({ name: typedName });

    await publish(page, editor, created.id);
    const published = await readPostTags(page, created.id);
    expect(published.status).toBe('published');

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(published.slug);
      await expect(sitePost.articleTitle).toHaveText(title);
      // The theme shows the primary tag, which is the first; the head carries them all
      await expect(sitePost.articleTag).toHaveText(seeded.name);
      expect(await headTagNames(sitePost)).toEqual([seeded.name, typedName]);

      const archive = new PublicPage(visitorPage);
      await archive.goto(`/tag/${typedSlug}/`);
      await expect(visitorPage.getByRole('heading', { level: 1 })).toHaveText(typedName);
      await expect(archive.linkWithPostName(title)).toBeVisible();
    });

    // A published post stages a settings edit until Update, so this click is
    // the only save
    await settings.openSection('tags');
    await settings.tags.remove(seeded.name);
    await expect(settings.tags.tokens).toHaveText([typedName]);
    await Promise.all([waitForPostSave(page, created.id), editor.header.updateButton.click()]);

    expect((await readPostTags(page, created.id)).tags).toEqual([
      { name: typedName, slug: typedSlug, visibility: 'public' },
    ]);

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(published.slug);
      await expect(sitePost.articleTag).toHaveText(typedName);
      expect(await headTagNames(sitePost)).toEqual([typedName]);
    });
  });

  test('draft post - a # tag saves as internal and stays off the site', async ({
    browser,
    baseURL,
    page,
  }) => {
    const stamp = Date.now();
    const title = `react-internal-tag-${stamp}`;
    const internalName = `#react-internal-${stamp}`;
    const internalSlug = `hash-react-internal-${stamp}`;
    const [seeded, created] = await Promise.all([
      tagFactory.create({ name: `Public Tag ${stamp}` }),
      postFactory.create({
        title,
        status: 'draft',
        lexical: buildLexicalParagraph('A paragraph an internal tag files under.'),
      }),
    ]);

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { settings } = editor;

    // The internal tag goes first, so the post has no public primary tag
    await settings.openSection('tags');
    await Promise.all([waitForPostSave(page, created.id), settings.tags.add(internalName)]);
    await Promise.all([waitForPostSave(page, created.id), settings.tags.add(seeded.name)]);
    await expect(settings.tags.tokens).toHaveText([internalName, seeded.name]);

    // Ghost makes a tag internal on save when its name starts with `#`
    expect((await readPostTags(page, created.id)).tags).toEqual([
      { name: internalName, slug: internalSlug, visibility: 'internal' },
      { name: seeded.name, slug: seeded.slug, visibility: 'public' },
    ]);
    expect(await findTagBySlug(page, internalSlug)).toMatchObject({
      name: internalName,
      visibility: 'internal',
    });

    await publish(page, editor, created.id);
    const published = await readPostTags(page, created.id);
    expect(published.status).toBe('published');

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(published.slug);
      await expect(sitePost.articleTitle).toHaveText(title);
      // An internal first tag is no primary tag, so the theme shows none
      await expect(sitePost.articleTag).toHaveCount(0);
      expect(await headTagNames(sitePost)).toEqual([seeded.name]);
      expect(await visitorPage.content()).not.toContain(internalName);
    });
  });
});
