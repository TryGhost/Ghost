import { PostEditorPage } from '@/admin-pages';
import { buildLexicalParagraph, createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import type { Page } from '@playwright/test';

interface SavedPost {
  id: string;
  title: string;
  lexical: string;
  status: 'draft' | 'published';
  updated_at: string;
}

async function readPost(page: Page, postId: string): Promise<SavedPost> {
  const response = await page.request.get(`/ghost/api/admin/posts/${postId}/?formats=lexical`);
  expect(response.status()).toBe(200);
  const { posts } = (await response.json()) as { posts: SavedPost[] };
  return posts[0];
}

function waitForPostWrite(page: Page, postId: string, body: string, status: number) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      new URL(response.url()).pathname === `/ghost/api/admin/posts/${postId}/` &&
      (response.request().postData() ?? '').includes(body) &&
      response.status() === status,
  );
}

async function editBody(editor: PostEditorPage, text: string, status: SavedPost['status']) {
  await editor.appendToBody(text);
  if (status === 'published') {
    await editor.header.update();
  }
}

test.describe('Ghost Admin - Editor conflict recovery', () => {
  for (const status of ['draft', 'published'] as const) {
    test(`${status} - preserves both writers' content until a confirmed reload, then saves again`, async ({
      page,
    }) => {
      const originalBody = `Original ${status} body.`;
      const mine = ' My unsaved words.';
      const theirs = ' Saved in the other tab.';
      const afterReload = ' Saved after accepting their version.';
      const created = await createPostFactory(page.request).create({
        title: `Conflict recovery ${status}`,
        status,
        lexical: buildLexicalParagraph(originalBody),
      });
      const initial = await readPost(page, created.id);
      const editor = new PostEditorPage(page);
      await editor.gotoPost(created.id);
      await expect(editor.lexicalEditor).toContainText(originalBody);

      // Both tabs load the same token. All responses come from real Core.
      const otherPage = await page.context().newPage();
      try {
        const otherEditor = new PostEditorPage(otherPage);
        await otherEditor.gotoPost(created.id);
        await expect(otherEditor.lexicalEditor).toContainText(originalBody);
        const [otherSave] = await Promise.all([
          waitForPostWrite(otherPage, created.id, theirs, 200),
          editBody(otherEditor, theirs, status),
        ]);
        const {
          posts: [otherSaved],
        } = (await otherSave.json()) as { posts: SavedPost[] };
        expect(otherSaved.updated_at).not.toBe(initial.updated_at);
        const serverBeforeCollision = await readPost(page, created.id);
        expect(serverBeforeCollision.lexical).toContain(theirs);
        expect(serverBeforeCollision.status).toBe(status);

        const [refusedSave] = await Promise.all([
          waitForPostWrite(page, created.id, mine, 409),
          editBody(editor, mine, status),
        ]);
        const { errors } = await refusedSave.json();
        expect(errors[0]).toMatchObject({ code: 'UPDATE_COLLISION', type: 'UpdateCollisionError' });
        await expect(editor.conflictBanner).toBeVisible();
        await expect(editor.lexicalEditor).toContainText(originalBody + mine);
        await expect(editor.lexicalEditor).not.toContainText(theirs);
        expect(await readPost(page, created.id)).toEqual(serverBeforeCollision);

        await editor.conflictReloadButton.click();
        await expect(editor.conflictReloadDialog).toBeVisible();
        await editor.conflictCancelReloadButton.click();
        await expect(editor.conflictReloadDialog).toBeHidden();
        await expect(editor.conflictBanner).toBeVisible();
        await expect(editor.lexicalEditor).toContainText(originalBody + mine);
        expect(await readPost(page, created.id)).toEqual(serverBeforeCollision);

        await editor.conflictReloadButton.click();
        await editor.conflictDiscardAndReloadButton.click();
        await expect(editor.conflictReloadDialog).toBeHidden();
        await expect(editor.conflictBanner).toBeHidden();
        await expect(editor.lexicalEditor).toContainText(originalBody + theirs);
        await expect(editor.lexicalEditor).not.toContainText(mine);

        const [nextSave] = await Promise.all([
          waitForPostWrite(page, created.id, afterReload, 200),
          editBody(editor, afterReload, status),
        ]);
        expect(JSON.parse(nextSave.request().postData() ?? '{}').posts[0].updated_at).toBe(
          serverBeforeCollision.updated_at,
        );
        const saved = await readPost(page, created.id);
        expect(saved.status).toBe(status);
        expect(saved.lexical).toContain(theirs);
        expect(saved.lexical).toContain(afterReload);
        expect(saved.lexical).not.toContain(mine);

        await page.reload();
        await expect(editor.lexicalEditor).toContainText(originalBody + theirs + afterReload);
        await expect(editor.conflictBanner).toBeHidden();
      } finally {
        await otherPage.close();
      }
    });
  }
});
