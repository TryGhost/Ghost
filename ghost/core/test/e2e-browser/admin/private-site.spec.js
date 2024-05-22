const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');

test.describe('Site Settings', () => {
    test.describe('Privacy setting', () => {
        test('A site set to private should require a password to access it', async ({sharedPage, browser}) => {
            // set private mode in admin "on"
            await sharedPage.goto('/ghost');

            await sharedPage.locator('[data-test-nav="settings"]').click();

            const section = sharedPage.getByTestId('locksite');

            await section.getByRole('button', {name: 'Edit'}).click();

            await section.getByLabel(/Enable password protection/).check();
            await section.getByLabel('Site password').fill('password');

            // save changes
            await section.getByRole('button', {name: 'Save'}).click();
            await expect(section.getByLabel('Site password')).toHaveCount(0);

            // copy site password
            //const passwordInput = await page.locator('[data-test-password-input]');
            //const sitePassword = await passwordInput.inputValue();

            // frontend needs new context to store cookies
            const frontendContext = await browser.newContext();
            const frontendPage = await frontendContext.newPage();

            // check the site is protected by a password
            await frontendPage.goto('/');
            await expect(frontendPage.getByRole('button', {name: 'Access site →'})).toBeVisible();

            // @NOTE: site access doesn't not work because Playwright ignores cookies set
            //        during the redirect response. Possibly related to https://github.com/microsoft/playwright/issues/5236
            // assert /private/?r=%2F
            // assert should not see the site front page
            // await frontendPage.getByPlaceholder('Password').fill(sitePassword);
            // await frontendPage.getByRole('button', {name: 'Access site →'}).click();
            // await frontendPage.waitForSelector('.site-title');
            // await expect(frontendPage.locator('.site-title')).toHaveText('The Local Test');

            // set private mode in admin "off"
            await section.getByRole('button', {name: 'Edit'}).click();

            await section.getByLabel(/Enable password protection/).uncheck();

            // save changes
            await section.getByRole('button', {name: 'Save'}).click();
            await expect(section.getByLabel('Site password')).toHaveCount(0);

            // check the site is publicly accessible
            await expect(async () => {
                await frontendPage.goto('/');
                await expect(frontendPage.locator('.gh-navigation-brand')).toHaveText('The Local Test');
            }).toPass();
        });
    });
});
