import { PostEditorPage, PostsPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';
import { postHistoryLatestText } from '@tryghost/test-data/selectors/editor';
import type { Page } from '@playwright/test';

/**
 * The Post history section of the React post editor's settings sidebar,
 * behind the `editorReact` Labs flag. Two explicit saves give a new draft two
 * versions of its own; the writer previews the older one, restores it, and the
 * restore is checked against what the server holds, what the history lists
 * afterwards and what a reload brings back. Which saves the server keeps as
 * versions, and in what order, is only observable against a real Ghost.
 */

const POSTS_API = '/ghost/api/admin/posts/';

interface Revision {
  title: string;
  lexical: string | null;
  created_at: string;
  created_at_ts: number;
}

/** The post and its versions newest first, by the millisecond stamp `created_at_ts`. */
async function readPostHistory(page: Page, postId: string) {
  const response = await page.request.get(
    `${POSTS_API}${postId}/?formats=lexical&include=post_revisions`,
  );
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  const revisions = (post.post_revisions as Revision[])
    .map((revision) => ({
      title: revision.title,
      lexical: revision.lexical,
      createdAtTs: revision.created_at_ts,
    }))
    .sort((a, b) => b.createdAtTs - a.createdAtTs);

  return {
    title: post.title as string,
    lexical: post.lexical as string,
    revisions,
  };
}

/** The save Cmd-S sends, which is the one that asks the server for a version. */
function waitForRevisionSave(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.url().includes('save_revision=true') &&
      response.status() === 200,
  );
}

test.describe('Ghost Admin - Post editor post history (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved.
  test.use({ labs: { editorReact: true } });

  test('draft - restoring an older version brings its title and body back and saves a new version', async ({
    page,
  }) => {
    const stamp = Date.now();
    const firstTitle = `react-history-first-${stamp}`;
    const firstBody = 'The paragraph the first version keeps.';
    const secondTitle = `react-history-second-${stamp}`;
    const secondBody = 'The paragraph the second version replaces it with.';

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
      editor.createDraft({ title: firstTitle, body: firstBody }),
    ]);
    const postId = await editor.getPostId();

    // The create is the post's first version and the history orders versions by
    // the second written, so each save waits out the status hold before the next.
    await editor.waitForSaved();
    await Promise.all([waitForRevisionSave(page, postId), page.keyboard.press('ControlOrMeta+s')]);
    await editor.waitForSaved();

    await editor.titleInput.fill(secondTitle);
    await editor.replaceBody(secondBody);
    await expect(editor.lexicalEditor).not.toContainText(firstBody);
    await Promise.all([waitForRevisionSave(page, postId), page.keyboard.press('ControlOrMeta+s')]);
    await editor.waitForSaved();

    const saved = await readPostHistory(page, postId);
    expect(saved.revisions).toHaveLength(3);
    expect(saved.revisions[0].title).toBe(secondTitle);
    expect(saved.revisions[0].lexical).toContain(secondBody);
    expect(saved.revisions[1].title).toBe(firstTitle);
    expect(saved.revisions[1].lexical).toContain(firstBody);
    expect(saved.revisions[2].title).toBe(firstTitle);

    const { history } = editor.settings.postHistory;
    await editor.settings.openSection('post-history');
    await expect(history.revisions).toHaveCount(saved.revisions.length);
    // The newest opens selected and is the only one labelled Latest
    await expect(history.revision(0).row).toContainText(postHistoryLatestText);
    await expect(history.revision(0).selectButton).toHaveAttribute('aria-current', 'true');
    await expect(history.revision(0).restoreButton).toHaveCount(0);
    await expect(history.revision(1).row).not.toContainText(postHistoryLatestText);
    await expect(history.previewTitle).toHaveText(secondTitle);
    await expect(history.previewBody).toContainText(secondBody);

    await history.revision(1).select();
    await expect(history.revision(1).selectButton).toHaveAttribute('aria-current', 'true');
    await expect(history.previewTitle).toHaveText(firstTitle);
    await expect(history.previewBody).toContainText(firstBody);
    await expect(history.previewBody).not.toContainText(secondBody);

    await history.restore(1);
    await expect(editor.titleInput).toHaveValue(firstTitle);
    await expect(editor.lexicalEditor).toContainText(firstBody);
    await expect(editor.lexicalEditor).not.toContainText(secondBody);

    // The restore is saved as a version of its own, ahead of the ones it chose from
    const restored = await readPostHistory(page, postId);
    expect(restored.title).toBe(firstTitle);
    expect(restored.lexical).toContain(firstBody);
    expect(restored.lexical).not.toContain(secondBody);
    expect(restored.revisions).toHaveLength(4);
    expect(restored.revisions[0].title).toBe(firstTitle);
    expect(restored.revisions[0].lexical).toContain(firstBody);
    expect(restored.revisions[0].lexical).not.toContain(secondBody);
    expect(restored.revisions.slice(1).map((revision) => revision.title)).toEqual(
      saved.revisions.map((revision) => revision.title),
    );

    await editor.settings.openSection('post-history');
    await expect(history.revisions).toHaveCount(restored.revisions.length);
    await expect(history.revision(0).row).toContainText(postHistoryLatestText);
    await expect(history.revision(0).restoreButton).toHaveCount(0);
    await expect(history.previewTitle).toHaveText(firstTitle);
    await history.revision(1).select();
    await expect(history.previewTitle).toHaveText(secondTitle);
    await editor.settings.closeSection('post-history');

    await page.reload();
    await expect(editor.titleInput).toHaveValue(firstTitle);
    await expect(editor.lexicalEditor).toContainText(firstBody);
  });
});
