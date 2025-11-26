import {PostEditorPage} from '@/admin-pages';
import {PostFactory, createPostFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';

test.describe('Post Preview Modal', () => {
    let postFactory: PostFactory;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
    });

    test('closes preview modal with ESC key when iframe has focus', async ({page}) => {
        const post = await postFactory.create({
            title: 'Test Post for ESC Key',
            status: 'draft'
        });

        // create a published post that will be in read more section of preview modal that you can preview
        // to ensure that iframe preview modal is focused when ESC key is pressed
        await postFactory.create({
            title: 'clickpost',
            status: 'published'
        });

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoPost(post.id);

        await postEditorPage.previewButton.click();
        await expect(postEditorPage.previewModal.modal).toBeVisible();

        await postEditorPage.previewModal.waitForPreviewModalFrame();
        await postEditorPage.previewModal.clickPostLinkByTitle('clickpost');
        await postEditorPage.previewModal.focusPreviewFrame();

        await postEditorPage.pressKey('Escape');
        await expect(postEditorPage.previewModal.modal).toBeHidden();
    });

    test('closes preview modal with ESC key when modal header has focus', async ({page}) => {
        const post = await postFactory.create({
            title: 'Test Post for ESC Key Baseline',
            status: 'draft'
        });

        const postEditorPage = new PostEditorPage(page);

        await postEditorPage.gotoPost(post.id);
        await postEditorPage.previewButton.click();
        await expect(postEditorPage.previewModal.modal).toBeVisible();

        await postEditorPage.previewModal.header.click();
        await postEditorPage.pressKey('Escape');
        await expect(postEditorPage.previewModal.modal).toBeHidden();
    });

    test('closes preview modal using close button', async ({page}) => {
        const post = await postFactory.create({
            title: 'Test Post for Close Button',
            status: 'draft'
        });

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoPost(post.id);

        await postEditorPage.previewButton.click();
        await expect(postEditorPage.previewModal.modal).toBeVisible();

        await postEditorPage.previewModal.close();
        await expect(postEditorPage.previewModal.modal).toBeHidden();
    });
});
