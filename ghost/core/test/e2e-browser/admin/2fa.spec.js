const DataGenerator = require('../../utils/fixtures/data-generator');
const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');

// NOTE: The tests do not use the shared page, as it needs to clear cookies
test.describe('2FA', () => {
    test.beforeAll(async ({sharedPage}) => {
        await sharedPage.goto('/ghost');
        await sharedPage.locator('.gh-nav a[href="#/settings/"]').click();

        const section = sharedPage.getByTestId('labs');
        await section.getByRole('button', {name: 'Open'}).click();

        await section.getByRole('tab', {name: 'Alpha features'}).click();
        await section.getByLabel('Staff 2FA').click();
    });

    test.afterAll(async ({sharedPage}) => {
        await sharedPage.goto('/ghost');
        await sharedPage.locator('.gh-nav a[href="#/settings/"]').click();

        const section = sharedPage.getByTestId('labs');
        await section.getByRole('button', {name: 'Open'}).click();

        await section.getByRole('tab', {name: 'Alpha features'}).click();
        await section.getByLabel('Staff 2FA').click();
    });

    test('Logging in with 2FA works', async ({page, verificationToken}) => {
        // Logout
        const context = await page.context();
        await context.clearCookies();

        await page.goto('/ghost');

        // Add owner user data from usual fixture
        const ownerUser = DataGenerator.Content.users.find(user => user.id === '1');

        await page.locator('#identification').fill(ownerUser.email);
        await page.locator('#password').fill(ownerUser.password);
        await page.getByRole('button', {name: 'Sign in'}).click();

        const token = await verificationToken.getToken();

        await page.locator('[data-test-input="token"]').fill(token);
        await page.locator('[data-test-button="verify"]').click();

        // Got to the dashboard successfully
        await expect(page.locator('.gh-nav-menu-details-sitetitle')).toHaveText(/The Local Test/);
    });

    test('Using the re-send button sends a second email', async ({page, verificationToken}) => {
        // Logout
        const context = await page.context();
        await context.clearCookies();

        await page.goto('/ghost');

        // Add owner user data from usual fixture
        const ownerUser = DataGenerator.Content.users.find(user => user.id === '1');

        await page.locator('#identification').fill(ownerUser.email);
        await page.locator('#password').fill(ownerUser.password);
        await page.getByRole('button', {name: 'Sign in'}).click();

        await page.getByRole('button', {name: 'Resend'}).click();
        await expect(page.locator('.forgotten-link')).toHaveText(/Resend again in [0-9]+s/);

        const token = await verificationToken.getToken();

        await page.locator('[data-test-input="token"]').fill(token);
        await page.locator('[data-test-button="verify"]').click();

        // Got to the dashboard successfully
        await expect(page.locator('.gh-nav-menu-details-sitetitle')).toHaveText(/The Local Test/);
    });
});
