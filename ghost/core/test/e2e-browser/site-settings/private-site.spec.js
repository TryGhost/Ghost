const {test, expect} = require('@playwright/test');

test.describe('Site Settings', () => {
    test.describe('Privacy setting', () => {
        test('A site set to private should require a password to access it', async ({page, browser}) => {
            // set private mode in admin "on"
            await page.goto('/ghost');

            await page.locator('[data-test-nav="settings"]').click();
            await page.locator('[data-test-nav="general"]').click();

            // @NOTE: needs a data-test selector
            await page.locator('label.switch span').click();

            // save changes
            await page.locator('[data-test-button="save"]').click();
            await page.getByRole('button', {name: 'Saved'}).waitFor({
                state: 'visible',
                timeout: 1000
            });

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

            // // set private mode in admin "off"
            // @NOTE: needs a data-test selector
            await page.locator('label.switch span').click();

            // save changes
            await page.locator('[data-test-button="save"]').click();
            await page.getByRole('button', {name: 'Saved'}).waitFor({
                state: 'visible',
                timeout: 1000
            });

            // check the site is publicly accessible
            await frontendPage.goto('/');
            await expect(frontendPage.locator('.site-title')).toHaveText('The Local Test');
        });
    });
});
