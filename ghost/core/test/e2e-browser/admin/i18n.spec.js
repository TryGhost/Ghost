const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createPostDraft} = require('../utils');

/**
 * @param {import('@playwright/test').Page} page
 */

async function setLanguage(sharedPage, language) {
    await sharedPage.goto('/ghost/#/settings/publication-language');
    const section = sharedPage.getByTestId('publication-language');
    await section.getByRole('button', {name: 'Edit'}).click();
    const input = section.getByPlaceholder('Site language');
    await input.fill(language);
    await section.getByRole('button', {name: 'Save'}).click();
}

test.describe('i18n', () => {
    test.describe('Newsletter', () => {
        test('changing the site language immediately translates strings in newsletters', async ({sharedPage}) => {
            await setLanguage(sharedPage, 'fr');

            const postData = {
                title: 'Publish and email post',
                body: 'This is my post body.'
            };

            await sharedPage.goto('/ghost');
            await createPostDraft(sharedPage, postData);

            // click the publish-preview button
            await sharedPage.locator('[data-test-button="publish-preview"]').first().click();
            // wait for the preview to load
            await sharedPage.waitForSelector('[data-test-button="email-preview"]');
            await sharedPage.locator('[data-test-button="email-preview"]').first().click();

            await sharedPage.waitForTimeout(1000);

            const metaText = await sharedPage.frameLocator('iframe.gh-pe-iframe').locator('td.post-meta').first().textContent();
            expect(metaText).toContain('Par Joe Bloggs');
            expect(metaText).not.toContain('By Joe Bloggs');

            // Set the language back before the next test!
            await setLanguage(sharedPage, 'en');
        });
    });
});
