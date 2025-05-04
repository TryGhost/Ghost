const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createPostDraft} = require('../utils');

async function setLanguage(sharedPage, language) {
    await sharedPage.goto('/ghost/#/settings/publication-language');
    const section = sharedPage.getByTestId('publication-language');
    await expect(section.getByText('en')).toHaveCount(1);
    await section.getByLabel('Site language').fill(language);
    await section.getByRole('button', {name: 'Save'}).click();

    await expect(section.getByLabel('Site language')).toHaveValue(language);
}

async function resetLanguage(sharedPage) {
    await sharedPage.goto('/ghost/#/settings/publication-language');
    const section = sharedPage.getByTestId('publication-language');
    await section.getByLabel('Site language').fill('en');
    await section.getByRole('button', {name: 'Save'}).click();

    await expect(section.getByLabel('Site language')).toHaveValue('en');
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

            const metaText = await sharedPage.frameLocator('iframe.gh-pe-iframe').locator('td.post-meta').first().textContent();

            await expect(metaText).toContain('Par Joe Bloggs');
            await expect(metaText).not.toContain('By Joe Bloggs');

            // close the email preview modal
            await sharedPage.keyboard.press('Escape');
            // reset language to en
            await resetLanguage(sharedPage);
        });
    });
});
