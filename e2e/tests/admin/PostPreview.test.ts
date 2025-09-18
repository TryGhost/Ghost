import {test, expect} from '../../helpers/playwright';
import {PostEditorPage} from '../../helpers/pages/admin';
import {createPostFactory} from '../../data-factory';
import type {PostFactory} from '../../data-factory';

test.describe('Post Preview Modal', () => {
    let postFactory: PostFactory;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page);
    });

    test('ESC key closes preview modal when iframe has focus', async ({page}) => {
        // Create a test post
        const post = await postFactory.create({
            title: 'Test Post for ESC Key',
            status: 'draft'
        });

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoExistingPost(post.id);

        // Open preview modal
        await postEditorPage.openPreview();
        expect(await postEditorPage.previewModal.isVisible()).toBe(true);

        // Click inside the iframe to focus it
        await postEditorPage.previewModal.clickInIframe();
        const iframeFocused = await postEditorPage.previewModal.isIframeFocused();
        expect(iframeFocused).toBe(true);

        // Test ESC key functionality
        await postEditorPage.testEscapeKey();
        await page.waitForTimeout(500);

        // Verify modal is closed
        const modalStillVisible = await postEditorPage.previewModal.isVisible();
        expect(modalStillVisible).toBe(false);
    });

    test('ESC key closes preview modal without iframe focus', async ({page}) => {
        const post = await postFactory.create({
            title: 'Test Post for ESC Key Baseline',
            status: 'draft'
        });

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoExistingPost(post.id);

        // Open preview modal
        await postEditorPage.openPreview();
        expect(await postEditorPage.previewModal.isVisible()).toBe(true);

        // Click on modal header to ensure focus is not on iframe
        await postEditorPage.previewModal.header.click();

        // Test ESC key
        await postEditorPage.testEscapeKey();
        await page.waitForTimeout(500);

        // Verify modal is closed
        const modalClosed = await postEditorPage.previewModal.isVisible();
        expect(modalClosed).toBe(false);
    });

    test('Close button works as fallback', async ({page}) => {
        const post = await postFactory.create({
            title: 'Test Post for Close Button',
            status: 'draft'
        });

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoExistingPost(post.id);

        // Open preview modal
        await postEditorPage.openPreview();
        expect(await postEditorPage.previewModal.isVisible()).toBe(true);

        // Use close button
        await postEditorPage.previewModal.close();

        // Verify modal is closed
        const modalClosed = await postEditorPage.previewModal.isVisible();
        expect(modalClosed).toBe(false);
    });
});