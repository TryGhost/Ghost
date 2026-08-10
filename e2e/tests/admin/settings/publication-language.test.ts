import {PostEditorPage} from '@/admin-pages';
import {PostFactory, createPostFactory} from '@/data-factory';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - i18n Newsletter', () => {
    let postFactory: PostFactory;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
    });

    test('changing the site language immediately translates strings in newsletters', async ({page, ghostAccountOwner}) => {
        const post = await postFactory.create({
            title: 'TITLE OF MY POST.',
            status: 'draft'
        });
        const settingsService = new SettingsService(page.request);
        await settingsService.updateSettings([{key: 'locale', value: 'fr'}]);

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoPost(post.id);
        await postEditorPage.previewButton.click();
        await postEditorPage.previewModal.switchToEmailTab();

        const emailPreviewContent = await postEditorPage.previewModal.emailPreviewContent();
        expect(emailPreviewContent).toContain(`Par ${ghostAccountOwner.name}`);
        expect(emailPreviewContent).not.toContain(`By ${ghostAccountOwner.name}`);
    });
});
