import {PostEditorPage} from '@/admin-pages';
import {createPostFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {faker} from '@faker-js/faker';

/**
 * Post preview modal tests, shared between the Ember implementation (labs
 * flag `editorX` off) and the React implementation (`editorX` on). Same page
 * objects and selectors for both runs.
 */
export function definePostPreviewTests() {
    test('preview modal opens and can be closed via close button, ESC from header, and ESC from iframe', async ({page}) => {
        const postFactory = createPostFactory(page.request);
        const linkedPostTitle = `Clickpost ${faker.string.alphanumeric(8)}`;

        const post = await postFactory.create({
            title: `Preview modal post ${faker.string.alphanumeric(8)}`,
            status: 'draft'
        });

        // create a published post that will be in read more section of preview modal
        await postFactory.create({
            title: linkedPostTitle,
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

        await postEditorPage.previewModalDesktopFrame.clickPostLinkByTitle(linkedPostTitle);
        await postEditorPage.previewModalDesktopFrame.focus();

        await postEditorPage.pressKey('Escape');
        await expect(postEditorPage.previewModal.modal).toBeHidden();
    });
}
