const DataGenerator = require('../../utils/fixtures/data-generator');
const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');

// NOTE: The tests do not use the shared page, as it needs to clear cookies
test.describe('2FA', () => {
    test.beforeAll(async ({sharedPage}) => {
        await sharedPage.goto('/ghost');
        await sharedPage.locator('.gh-nav a[href="#/settings/"]').click();

        // Make an API call to get settings
        const adminUrl = new URL(sharedPage.url()).origin + '/ghost';
        const settingsResponse = await sharedPage.request.get(`${adminUrl}/api/admin/settings/`);
        const settingsData = await settingsResponse.json();
        // Add staff2fa flag to labs settings
        const settings = settingsData.settings;
        const labsSetting = settings.find(s => s.key === 'labs');
        const labsValue = JSON.parse(labsSetting.value);
        labsValue.staff2fa = true;
        labsSetting.value = JSON.stringify(labsValue);

        // Update settings
        await sharedPage.request.put(`${adminUrl}/api/admin/settings/`, {
            data: {
                settings
            }
        });
    });

    test.afterAll(async ({sharedPage}) => {
        // Make an API call to get settings
        const adminUrl = new URL(sharedPage.url()).origin + '/ghost';
        const settingsResponse = await sharedPage.request.get(`${adminUrl}/api/admin/settings/`);
        const settingsData = await settingsResponse.json();
        // Remove staff2fa flag from labs settings
        const settings = settingsData.settings;
        const labsSetting = settings.find(s => s.key === 'labs');
        const labsValue = JSON.parse(labsSetting.value);
        delete labsValue.staff2fa;
        labsSetting.value = JSON.stringify(labsValue);

        // Update settings
        await sharedPage.request.put(`${adminUrl}/api/admin/settings/`, {
            data: {
                settings
            }
        });
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
        await expect(page.locator('.forgotten-link')).toHaveText(/Sent/);

        const token = await verificationToken.getToken();

        await page.locator('[data-test-input="token"]').fill(token);
        await page.locator('[data-test-button="verify"]').click();

        // Got to the dashboard successfully
        await expect(page.locator('.gh-nav-menu-details-sitetitle')).toHaveText(/The Local Test/);
    });
});
