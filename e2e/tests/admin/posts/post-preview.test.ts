import { PostEditorPage } from '@/admin-pages';
import { PostFactory, createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';

for (const editorReact of [false, true]) {
  test.describe(`Post Preview Modal (${editorReact ? 'React' : 'Ember'} editor)`, () => {
    test.use({ labs: { editorReact } });

    let postFactory: PostFactory;
    let postEditorPage: PostEditorPage;

    test.beforeEach(async ({ page }) => {
      postFactory = createPostFactory(page.request);
      postEditorPage = new PostEditorPage(page, {
        implementation: editorReact ? 'react' : 'ember',
      });
    });

    test('preview modal closes via close button and ESC from header', async () => {
      const post = await postFactory.create({
        title: 'Test Post for Preview Modal',
        status: 'draft',
      });
      await postEditorPage.gotoPost(post.id);

      await postEditorPage.previewButton.click();
      await expect(postEditorPage.previewModal.modal).toBeVisible();

      await postEditorPage.previewModal.close();
      await expect(postEditorPage.previewModal.modal).toBeHidden();

      await postEditorPage.previewButton.click();
      await expect(postEditorPage.previewModal.modal).toBeVisible();

      await postEditorPage.previewModal.header.click();
      await postEditorPage.pressKey('Escape');
      await expect(postEditorPage.previewModal.modal).toBeHidden();
    });

    test('preview modal closes via ESC when the iframe has focus', async () => {
      const post = await postFactory.create({
        title: 'Test Post for Preview Modal',
        status: 'draft',
      });
      // A published post for the preview's read-more section to link to
      await postFactory.create({
        title: 'clickpost',
        status: 'published',
      });
      await postEditorPage.gotoPost(post.id);

      await postEditorPage.previewButton.click();
      await expect(postEditorPage.previewModal.modal).toBeVisible();

      await postEditorPage.previewModalDesktopFrame.clickPostLinkByTitle('clickpost');
      await postEditorPage.previewModalDesktopFrame.focus();

      await postEditorPage.pressKey('Escape');
      await expect(postEditorPage.previewModal.modal).toBeHidden();
    });
  });
}
