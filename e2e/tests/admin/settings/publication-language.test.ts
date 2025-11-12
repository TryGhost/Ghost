import {PostEditorPage, SettingsPage} from '../../../helpers/pages/admin';
import {PostFactory, createPostFactory} from '../../../data-factory';
import {expect, test} from '../../../helpers/playwright';

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

        const adminPublicationPage = new SettingsPage(page).publicationSection;
        await adminPublicationPage.goto();
        await adminPublicationPage.setLanguage('fr');
        await expect(adminPublicationPage.languageField).toHaveValue('fr');

        const postEditorPage = new PostEditorPage(page);
        await postEditorPage.gotoPost(post.id);
        await postEditorPage.previewButton.click();
        await postEditorPage.previewModal.emailTabButton.click();

        const emailPreviewContent = await postEditorPage.previewModal.content();
        expect(emailPreviewContent).toContain(`Par ${ghostAccountOwner.name}`);
        expect(emailPreviewContent).not.toContain(`By ${ghostAccountOwner.name}`);
    });
});
