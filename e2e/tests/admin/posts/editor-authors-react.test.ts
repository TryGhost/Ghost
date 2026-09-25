import { PostEditorPage } from '@/admin-pages';
import { PostFactory, buildLexicalParagraph, createPostFactory } from '@/data-factory';
import { PostPage, PublicPage } from '@/helpers/pages';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';
import type { Page } from '@playwright/test';

/**
 * The Authors section of the React post editor's settings sidebar, behind the
 * `editorReact` Labs flag, as the Owner. The cases follow the author list the
 * whole way round: who the writer adds or removes, the order and primary
 * author the server holds afterwards, and the byline and author archive the
 * site renders. A draft saves the list as soon as it changes; a published post
 * stages the change until Update. The section offers no reordering, so the
 * primary author moves by removing the one ahead.
 */

const POSTS_API = '/ghost/api/admin/posts/';
const USERS_API = '/ghost/api/admin/users/';

interface StaffUser {
  id: string;
  name: string;
  slug: string;
  email: string;
}

async function readPostAuthors(page: Page, postId: string) {
  const response = await page.request.get(`${POSTS_API}${postId}/?include=authors`);
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  return {
    status: post.status as string,
    slug: post.slug as string,
    authorIds: (post.authors as { id: string }[]).map((author) => author.id),
    primaryAuthorId: post.primary_author.id as string,
  };
}

/** The staff member behind an email, as the authors picker lists them. */
async function findStaffByEmail(page: Page, email: string): Promise<StaffUser> {
  const response = await page.request.get(`${USERS_API}?limit=all`);
  expect(response.status()).toBe(200);
  const { users } = await response.json();
  const user = (users as StaffUser[]).find((candidate) => candidate.email === email);
  if (!user) {
    throw new Error(`No staff user with email ${email}`);
  }

  return { id: user.id, name: user.name, slug: user.slug, email: user.email };
}

function waitForPostSave(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.status() === 200,
  );
}

/** A non-event can only be asserted over a window; this one outlasts a field save. */
async function expectNoWrites(page: Page): Promise<void> {
  await expect(
    page.waitForRequest(
      (request) =>
        (request.method() === 'POST' || request.method() === 'PUT') &&
        request.url().includes(POSTS_API),
      { timeout: 6000 },
    ),
  ).rejects.toThrow();
}

test.describe('Ghost Admin - Post editor authors (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved.
  test.use({ labs: { editorReact: true } });

  let postFactory: PostFactory;

  test.beforeEach(async ({ page }) => {
    postFactory = createPostFactory(page.request);
  });

  test('draft post - a second author saves on pick behind the Owner and takes over as primary once the Owner is removed after publishing', async ({
    browser,
    baseURL,
    page,
    ghostAccountOwner,
    ghostAccountAuthor,
  }) => {

    const stamp = Date.now();
    const title = `react-authors-${stamp}`;
    const [owner, second, created] = await Promise.all([
      findStaffByEmail(page, ghostAccountOwner.email),
      findStaffByEmail(page, ghostAccountAuthor.email),
      postFactory.create({
        title,
        status: 'draft',
        lexical: buildLexicalParagraph('A paragraph two authors share.'),
      }),
    ]);

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { settings } = editor;

    await settings.openSection('authors');
    await expect(settings.authors.chips).toHaveText([owner.name]);
    // A draft saves the list the moment it changes, so the pick is its own PUT
    await Promise.all([waitForPostSave(page, created.id), settings.authors.add(second.name)]);
    await expect(settings.authors.chips).toHaveText([owner.name, second.name]);

    expect(await readPostAuthors(page, created.id)).toMatchObject({
      status: 'draft',
      authorIds: [owner.id, second.id],
      primaryAuthorId: owner.id,
    });

    await editor.publishFlow.open();
    await expect(editor.publishFlow.optionsStep).toBeVisible();
    await Promise.all([waitForPostSave(page, created.id), editor.publishFlow.confirm()]);
    await expect(editor.publishFlow.completeStep).toBeVisible();
    await editor.publishFlow.dismiss();
    const published = await readPostAuthors(page, created.id);
    expect(published.status).toBe('published');

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(published.slug);
      await expect(sitePost.articleTitle).toHaveText(title);
      await expect(sitePost.articleAuthorName).toHaveText(`${owner.name}, ${second.name}`);
    });

    // A published post stages a settings edit until Update, so this click is
    // the only save
    await settings.openSection('authors');
    await settings.authors.remove(owner.name);
    await expect(settings.authors.chips).toHaveText([second.name]);
    await Promise.all([waitForPostSave(page, created.id), editor.header.updateButton.click()]);

    expect(await readPostAuthors(page, created.id)).toMatchObject({
      authorIds: [second.id],
      primaryAuthorId: second.id,
    });

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(published.slug);
      await expect(sitePost.articleAuthorName).toHaveText(second.name);

      const archive = new PublicPage(visitorPage);
      await archive.goto(`/author/${second.slug}/`);
      await expect(visitorPage.getByRole('heading', { level: 1 })).toHaveText(second.name);
      await expect(archive.linkWithPostName(title)).toBeVisible();
    });
  });

  test('draft post - removing the only author is refused and sends nothing', async ({
    page,
    ghostAccountOwner,
  }) => {
    const owner = await findStaffByEmail(page, ghostAccountOwner.email);
    const created = await postFactory.create({
      title: `react-last-author-${Date.now()}`,
      status: 'draft',
      lexical: buildLexicalParagraph('A paragraph that keeps its author.'),
    });

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { settings } = editor;

    await settings.openSection('authors');
    await expect(settings.authors.chips).toHaveText([owner.name]);
    await settings.authors.remove(owner.name);

    // The section reports the empty list and the save policy holds it back
    await expect(settings.authors.error).toBeVisible();
    await expect(settings.authors.chips).toHaveCount(0);
    await expectNoWrites(page);

    expect(await readPostAuthors(page, created.id)).toMatchObject({
      authorIds: [owner.id],
      primaryAuthorId: owner.id,
    });
  });
});
