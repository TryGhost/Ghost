import { PostEditorPage, PostsPage } from '@/admin-pages';
import { PostFactory, buildLexicalParagraph, createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import type { Page } from '@playwright/test';

/**
 * The Delete section of the React post editor's settings sidebar, behind the
 * `editorReact` Labs flag. Each case opens a post, backs out of the
 * confirmation once, then confirms it, and follows the deletion the whole way
 * round: where the editor lands, what the list shows, and what the Admin API
 * and the site answer for the post afterwards. That the post is really gone
 * is only observable against a real Ghost.
 */

const POSTS_API = '/ghost/api/admin/posts/';

async function readPostStatus(page: Page, postId: string): Promise<number> {
  const response = await page.request.get(`${POSTS_API}${postId}/`);
  return response.status();
}

function waitForPostDelete(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.status() === 204,
  );
}

test.describe('Ghost Admin - Post editor delete (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved. Delete leaves for the
  // list through the router, which only the React list follows.
  test.use({ labs: { editorReact: true, postsListReact: true } });

  let postFactory: PostFactory;

  test.beforeEach(async ({ page }) => {
    postFactory = createPostFactory(page.request);
  });

  test('published post - cancel keeps it, confirm removes it from the list, the API and the site', async ({
    page,
  }) => {
    const title = `react-delete-published-${Date.now()}`;
    const created = await postFactory.create({
      title,
      status: 'published',
      lexical: buildLexicalParagraph('A paragraph the deletion takes with it.'),
    });

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { settings } = editor;

    await settings.openSection('delete');
    await settings.delete.button.click();
    await expect(settings.delete.dialog).toBeVisible();
    await settings.delete.cancelButton.click();
    await expect(settings.delete.dialog).toBeHidden();
    await expect(editor.titleInput).toHaveValue(title);
    expect(await readPostStatus(page, created.id)).toBe(200);

    await Promise.all([waitForPostDelete(page, created.id), settings.delete.deletePost()]);

    const postsPage = new PostsPage(page, { implementation: 'react' });
    await postsPage.waitForPageToFullyLoad();
    await expect(postsPage.postsListItem.first()).toBeVisible();
    await expect(postsPage.getPostByTitle(title)).toHaveCount(0);
    expect(await readPostStatus(page, created.id)).toBe(404);
    await expect.poll(async () => (await page.request.get(`/${created.slug}/`)).status()).toBe(404);
  });

  test('draft - cancel keeps it, confirm removes it from the list and the API', async ({
    page,
  }) => {
    const title = `react-delete-draft-${Date.now()}`;
    const created = await postFactory.create({
      title,
      status: 'draft',
      lexical: buildLexicalParagraph('A paragraph the deletion takes with it.'),
    });

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { settings } = editor;

    await settings.openSection('delete');
    await settings.delete.button.click();
    await expect(settings.delete.dialog).toBeVisible();
    await settings.delete.cancelButton.click();
    await expect(settings.delete.dialog).toBeHidden();
    await expect(editor.titleInput).toHaveValue(title);
    expect(await readPostStatus(page, created.id)).toBe(200);

    await Promise.all([waitForPostDelete(page, created.id), settings.delete.deletePost()]);

    const postsPage = new PostsPage(page, { implementation: 'react' });
    await postsPage.waitForPageToFullyLoad();
    await expect(postsPage.postsListItem.first()).toBeVisible();
    await expect(postsPage.getPostByTitle(title)).toHaveCount(0);
    expect(await readPostStatus(page, created.id)).toBe(404);
  });
});
