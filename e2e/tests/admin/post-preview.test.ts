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
        const post = await postFactory.create({
            title: 'Test Post for ESC Key',
            status: 'draft'
        });

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoPost(post.id);

        await postEditorPage.openPreview();
        expect(await postEditorPage.previewModal.isVisible()).toBe(true);

        const postContent = await postEditorPage.previewModal.getPostContent();
        await postContent.image.click();

        await postEditorPage.pressKey('Escape');

        await postEditorPage.previewModal.waitForHidden();
        expect(await postEditorPage.previewModal.isVisible()).toBe(false);
    });

    test('closes preview modal with ESC key when modal header has focus', async ({page}) => {
        const post = await postFactory.create({
            title: 'Test Post for ESC Key Baseline',
            status: 'draft'
        });

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoPost(post.id);

        await postEditorPage.openPreview();
        expect(await postEditorPage.previewModal.isVisible()).toBe(true);

        await postEditorPage.previewModal.header.click();

        await postEditorPage.pressKey('Escape');

        await postEditorPage.previewModal.waitForHidden();
        expect(await postEditorPage.previewModal.isVisible()).toBe(false);
    });

    test('closes preview modal using close button', async ({page}) => {
        const post = await postFactory.create({
            title: 'Test Post for Close Button',
            status: 'draft'
        });

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoPost(post.id);

        await postEditorPage.openPreview();
        expect(await postEditorPage.previewModal.isVisible()).toBe(true);

        await postEditorPage.previewModal.close();

        expect(await postEditorPage.previewModal.isVisible()).toBe(false);
    });
});
