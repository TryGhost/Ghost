const {expect, test} = require('@playwright/test');
const {disconnectStripe, setupStripe, generateStripeIntegrationToken} = require('../utils');

test.describe('Membership Settings', () => {
    test.describe('Portal settings', () => {
        test('Shows free tier toggle when stripe is disconnected', async ({page}) => {
            await page.goto('/ghost');
            // Disconnect stripe
            await disconnectStripe(page);

            // Open Portal settings
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/settings/"]').click();
            await page.locator('.gh-setting-group').filter({hasText: 'Membership'}).click();
            await page.locator('[data-test-toggle="portal-settings"]').click();
            // Check free tier toggle is visible
            await expect(page.locator('label').filter({hasText: 'Free'}).first()).toBeVisible();

            // Reconnect Stripe for other tests
            const stripeToken = await generateStripeIntegrationToken();
            await page.goto('/ghost');
            await setupStripe(page, stripeToken);
        });
    });
});
