import {PostEditorPage} from '@/admin-pages';
import {PostFactory, createPostFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';

test.describe('Post Preview Modal', () => {
    let postFactory: PostFactory;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
    });

    test('preview modal opens and can be closed via close button, ESC from header, and ESC from iframe', async ({page}) => {
        const post = await postFactory.create({
            title: 'Test Post for Preview Modal',
            status: 'draft'
        });

        // create a published post that will be in read more section of preview modal
        await postFactory.create({
            title: 'clickpost',
            status: 'published'
        });

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoPost(post.id);

        // Close via close button
        await postEditorPage.previewButton.click();
        await expect(postEditorPage.previewModal.modal).toBeVisible();

        await postEditorPage.previewModal.close();
        await expect(postEditorPage.previewModal.modal).toBeHidden();

        // Close via ESC key from modal header
        await postEditorPage.previewButton.click();
        await expect(postEditorPage.previewModal.modal).toBeVisible();

        await postEditorPage.previewModal.header.click();
        await postEditorPage.pressKey('Escape');
        await expect(postEditorPage.previewModal.modal).toBeHidden();

        // Close via ESC key when iframe has focus
        await postEditorPage.previewButton.click();
        await expect(postEditorPage.previewModal.modal).toBeVisible();

        await postEditorPage.previewModalDesktopFrame.clickPostLinkByTitle('clickpost');
        await postEditorPage.previewModalDesktopFrame.focus();

        await postEditorPage.pressKey('Escape');
        await expect(postEditorPage.previewModal.modal).toBeHidden();
    });
});
