const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {disconnectStripe, setupStripe, generateStripeIntegrationToken, getStripeAccountId} = require('../utils');

test.describe('Membership Settings', () => {
    test.describe('Portal settings', () => {
        test('Shows free tier toggle when stripe is disconnected', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');
            // Disconnect stripe
            await disconnectStripe(sharedPage);

            // Open Portal settings
            await sharedPage.goto('/ghost');
            await sharedPage.locator('[data-sidebar="sidebar"]').getByRole('link', {name: 'Settings'}).click();
            await sharedPage.getByTestId('portal').getByRole('button', {name: 'Customize'}).click();

            const modal = sharedPage.getByTestId('portal-modal');
            // Check free tier toggle is visible
            await expect(modal.locator('label').filter({hasText: 'Free'}).first()).toBeVisible();

            // Reconnect Stripe for other tests
            const stripeAccountId = await getStripeAccountId();
            const stripeToken = await generateStripeIntegrationToken(stripeAccountId);
            await sharedPage.goto('/ghost');
            await setupStripe(sharedPage, stripeToken);
        });
    });
});
