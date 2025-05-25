const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createPostDraft} = require('../utils');

const {
    AdminDashboardPage,
    AdminPostsPage,
    AdminPostsEmailPreviewPage,
    AdminPublicationPage
} = require('./pages/index');

test.describe('i18n', () => {
    test.describe('Newsletter', () => {
        test('Changing the site language immediately translates strings in newsletters', async ({sharedPage}) => {
            const postToCreate = {title: 'TITLE OF MY POST.', body: 'BODY OF MY POST.'};

            const adminPublicationPage = new AdminPublicationPage(sharedPage);
            await adminPublicationPage.visit();
            await adminPublicationPage.setLanguage('fr');
            await expect(adminPublicationPage.languageField).toHaveValue('fr');

            await new AdminDashboardPage(sharedPage).visit();
            await createPostDraft(sharedPage, postToCreate);

            const adminPostsPage = new AdminPostsPage(sharedPage);
            await adminPostsPage.previewPost();
            await adminPostsPage.emailPreviewForPost();

            const adminPostsEmailPreviewPage = new AdminPostsEmailPreviewPage(sharedPage);
            const emailPreviewContent = await adminPostsEmailPreviewPage.content();

            await expect(emailPreviewContent).toContain('Par Joe Bloggs');
            await expect(emailPreviewContent).not.toContain('By Joe Bloggs');

            await adminPostsEmailPreviewPage.closeEmailPreviewForPost();
            await adminPublicationPage.visit();
            await adminPublicationPage.resetToDefaultLanguage();
        });
    });
});
