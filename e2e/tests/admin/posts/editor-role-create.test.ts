import { LoginPage, PostEditorPage, PostsPage, SitePage } from '@/admin-pages';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';
import type { Browser, Page } from '@playwright/test';

interface Writer {
  email: string;
  password: string;
}

interface SavedPost {
  id: string;
  title: string;
  lexical: string;
  status: string;
  updated_at: string;
  authors: { id: string }[];
}

async function readPost(page: Page, postId: string): Promise<SavedPost> {
  const response = await page.request.get(
    `/ghost/api/admin/posts/${postId}/?formats=lexical&include=authors`,
  );
  expect(response.status()).toBe(200);
  const { posts } = (await response.json()) as { posts: SavedPost[] };
  return posts[0];
}

async function expectWriterCanCreateAndSave({
  browser,
  baseURL,
  writer,
  role,
}: {
  browser: Browser;
  baseURL: string;
  writer: Writer;
  role: 'Author' | 'Contributor';
}) {
  await withIsolatedPage(
    browser,
    { baseURL, extraHTTPHeaders: { Origin: baseURL } },
    async ({ page }) => {
      const login = new LoginPage(page);
      await login.goto();
      await login.signIn(writer.email, writer.password);
      // Wait out the post-signin redirect so it can't override the navigation below.
      if (role === 'Author') {
        await new SitePage(page).waitForPageToFullyLoad();
      } else {
        await new PostsPage(page).waitForPageToFullyLoad();
      }

      const meResponse = await page.request.get('/ghost/api/admin/users/me/?include=roles');
      expect(meResponse.status()).toBe(200);
      const {
        users: [me],
      } = await meResponse.json();
      expect(me.email).toBe(writer.email);
      expect(me.roles.map((userRole: { name: string }) => userRole.name)).toEqual([role]);

      const title = `${role} created this draft`;
      const body = `Written in the ${role} editor.`;
      const addition = ' Saved by the same writer.';
      const posts = new PostsPage(page);
      await posts.goto();
      await posts.newPostButton.click();
      const editor = new PostEditorPage(page);
      const [createdResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            new URL(response.url()).pathname === '/ghost/api/admin/posts/',
        ),
        editor.createDraft({ title, body }),
      ]);
      expect(createdResponse.status()).toBe(201);
      const {
        posts: [created],
      } = (await createdResponse.json()) as { posts: SavedPost[] };
      expect(created.authors.map(({ id }) => id)).toEqual([me.id]);
      expect(created.status).toBe('draft');
      const postId = await editor.getPostId();
      expect(postId).toBe(created.id);

      const [saveResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.request().method() === 'PUT' &&
            new URL(response.url()).pathname === `/ghost/api/admin/posts/${postId}/` &&
            (response.request().postData() ?? '').includes(addition),
        ),
        (async () => {
          await editor.appendToBody(addition);
          await page.keyboard.press('ControlOrMeta+s');
        })(),
      ]);
      expect(saveResponse.status()).toBe(200);
      const saved = await readPost(page, postId);
      expect(saved).toMatchObject({ title, status: 'draft' });
      expect(saved.lexical).toContain(body);
      expect(saved.lexical).toContain(addition);
      expect(saved.authors.map(({ id }) => id)).toEqual([me.id]);

      await page.reload();
      await expect(editor.titleInput).toHaveValue(title);
      await expect(editor.lexicalEditor).toContainText(body + addition);
      await expect(editor.previewButton).toBeVisible();

      if (role === 'Author') {
        await expect(editor.publishFlow.publishButton).toBeVisible();
        await expect(editor.header.saveButton).toHaveCount(0);
        await editor.publishFlow.open();
        await editor.publishFlow.confirm();
        await expect(page).toHaveURL('/ghost/#/posts');
        const published = await readPost(page, postId);
        expect(published.status).toBe('published');
        expect(published.authors.map(({ id }) => id)).toEqual([me.id]);
        expect(published.lexical).toContain(body);
        expect(published.lexical).toContain(addition);
      } else {
        await expect(editor.header.saveButton).toBeVisible();
        await expect(editor.publishFlow.publishButton).toHaveCount(0);
        await expect(editor.updateFlowButton).toHaveCount(0);
        const refusedPublish = await page.request.put(`/ghost/api/admin/posts/${postId}/`, {
          data: { posts: [{ status: 'published', updated_at: saved.updated_at }] },
        });
        expect(refusedPublish.status()).toBe(403);
        expect(await readPost(page, postId)).toEqual(saved);
      }
    },
  );
}

test.describe('Ghost Admin - Editor draft ownership', () => {
  test.use({ labs: { editorReact: true, authReact: true } });

  // Applying the Labs settings uses the Owner fixture before the isolated writer signs in.
  test.beforeEach(async ({ page }) => {
    await page.waitForLoadState();
  });

  test('Author creates and saves their own draft, then publishes it', async ({
    browser,
    baseURL,
    ghostAccountAuthor,
  }) => {
    test.setTimeout(90000);
    await expectWriterCanCreateAndSave({
      browser,
      baseURL: baseURL!,
      writer: ghostAccountAuthor,
      role: 'Author',
    });
  });

  test('Contributor creates and saves their own draft, with publishing unavailable', async ({
    browser,
    baseURL,
    ghostAccountContributor,
  }) => {
    test.setTimeout(90000);
    await expectWriterCanCreateAndSave({
      browser,
      baseURL: baseURL!,
      writer: ghostAccountContributor,
      role: 'Contributor',
    });
  });
});
