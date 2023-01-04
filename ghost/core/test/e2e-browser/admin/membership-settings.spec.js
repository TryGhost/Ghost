const {expect, test} = require('@playwright/test');
const {disconnectStripe, setupStripe, generateStripeIntegrationToken} = require('../utils');

test.describe('Membership Settings', () => {
    test.describe('Portal settings', () => {
        test('Shows free tier when stripe is disconnected', async ({page}) => {
            await page.goto('/ghost');
            await disconnectStripe(page);
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/settings/"]').click();
            await page.locator('.gh-setting-group').filter({hasText: 'Membership'}).click();
            await page.locator('[data-test-toggle="portal-settings"]').click();
            await expect(page.locator('label').filter({hasText: 'Free'}).first()).toBeVisible();
            await page.goto('/ghost');
            const stripeToken = await generateStripeIntegrationToken();
            await setupStripe(page, stripeToken);
        });
    });
});
