import {test, expect} from '../../helpers/playwright';
import {PostEditorPage} from '../../helpers/pages/admin';
import {createPostFactory} from '../../data-factory';
import type {PostFactory} from '../../data-factory';

test.describe('Post Preview Modal', () => {
    let postFactory: PostFactory;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page);
    });

    test('closes preview modal with ESC key when iframe has focus', async ({page}) => {
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

        // Press ESC key - implementation should handle it regardless of iframe focus
        await page.keyboard.press('Escape');

        // Verify modal is closed
        await postEditorPage.previewModal.waitForHidden();
        expect(await postEditorPage.previewModal.isVisible()).toBe(false);
    });

    test('closes preview modal with ESC key when modal header has focus', async ({page}) => {
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

        // Press ESC key to close modal
        await page.keyboard.press('Escape');

        // Verify modal is closed
        await postEditorPage.previewModal.waitForHidden();
        expect(await postEditorPage.previewModal.isVisible()).toBe(false);
    });

    test('closes preview modal using close button', async ({page}) => {
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

        // Verify modal is closed (close() method already waits for hidden)
        expect(await postEditorPage.previewModal.isVisible()).toBe(false);
    });
});