const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {slugify} = require('@tryghost/string');
const {createPostDraft} = require('../utils');


/**
 * @param {import('@playwright/test').Page} page
 */
const openPublishFlow = async (page) => {
    await page.locator('[data-test-button="publish-flow"]').first().click();
};

/**
 * @param {import('@playwright/test').Page} page
 */
const closePublishFlow = async (page) => {
    await page.locator('[data-test-button="close-publish-flow"]').click();
};

/**
 * @param {import('@playwright/test').Page} page
 */

test.describe('i18n validation', () => {
    test.describe('Preview newsletter', () => {
        test('Preview in French', async ({sharedPage}) => {
            // navigate to settings and change to French
            await sharedPage.goto('/ghost/#/settings/publication-language');
            const section = sharedPage.getByTestId('publication-language');
            await section.getByRole('button', {name: 'Edit'}).click();
            const input = section.getByPlaceholder('Site language');
            await input.fill('fr');
            await section.getByRole('button', {name: 'Save'}).click();

            const labsSection = sharedPage.getByTestId('labs');
            await labsSection.getByRole('button', {name: 'Open'}).click();
            let portalLabel = labsSection.getByText('Portal translation');
            let portalToggle = portalLabel.locator('..').locator('..').locator('..').getByRole('switch');
            await portalToggle.click();

            const postData = {
                title: 'Publish and email post',
                body: 'This is my post body.'
            };

            await sharedPage.goto('/ghost');
            await createPostDraft(sharedPage, postData);

            // click the publish-preview button
            await sharedPage.locator('[data-test-button="publish-preview"]').first().click();
            // wait for the preview to load
            await sharedPage.waitForSelector('[data-test-button="email-preview"]')
            await sharedPage.locator('[data-test-button="email-preview"]').first().click();

            await sharedPage.waitForTimeout(1000);

            const metaText = await sharedPage.frameLocator('iframe.gh-pe-iframe').locator('td.post-meta').first().textContent();
            expect(metaText).toContain('Par Joe Bloggs');
            expect(metaText).not.toContain('By Joe Bloggs');

            //await closePublishFlow(sharedPage);

        });
        test('Preview in English', async ({sharedPage}) => {
            await sharedPage.goto('/ghost/#/settings/publication-language');
            const section = sharedPage.getByTestId('publication-language');
            await section.getByRole('button', {name: 'Edit'}).click();
            const input = section.getByPlaceholder('Site language');
            await input.fill('en');
            await section.getByRole('button', {name: 'Save'}).click();
            const postData = {
                title: 'Publish and email post',
                body: 'This is my post body.'
            };

            await sharedPage.goto('/ghost');
            await createPostDraft(sharedPage, postData);
            // click the publish-preview button
            await sharedPage.locator('[data-test-button="publish-preview"]').first().click();
            // wait for the preview to load
            await sharedPage.waitForSelector('[data-test-button="email-preview"]')
            await sharedPage.locator('[data-test-button="email-preview"]').first().click();

            await sharedPage.waitForTimeout(1000);

            const metaText = await sharedPage.frameLocator('iframe.gh-pe-iframe').locator('td.post-meta').first().textContent();
            expect(metaText).toContain('By Joe Bloggs');
            expect(metaText).not.toContain('Par Joe Bloggs');


        });  

    });
});
