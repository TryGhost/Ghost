const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {deleteAllMembers, completeStripeSubscription} = require('../utils');

test.describe('Portal', () => {
    test.describe('Tiers', () => {
        test('Sign up for paid plan via portal - single tier', async ({sharedPage}) => {
            // make sure we have no members to start fresh
            await sharedPage.goto('/ghost');
            await deleteAllMembers(sharedPage);

            // go to website and open portal
            await sharedPage.goto('/');
            const portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            await portalTriggerButton.click();

            // fill out signup form and submit
            await portalFrame.locator('[data-test-input="input-name"]').fill('Testy McTesterson');
            await portalFrame.locator('[data-test-input="input-email"]').fill('testy+paidsignup@example.com');
            await portalFrame.locator('[data-test-button="select-tier"]').nth(1).click();

            // in case of multiple newsletters, click continue for newsletter selection
            const hasContinueBtn = await portalFrame.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrame.getByRole('button', {name: 'Continue'}).click();
            }

            // complete the stripe checkout flow
            await completeStripeSubscription(sharedPage);

            // come back to the website, open portal and check member is logged in and has paid
            await portalTriggerButton.click();
            await expect(portalFrame.getByText('testy+paidsignup@example.com')).toBeVisible();
            await expect(portalFrame.getByRole('heading', {name: 'Billing info'})).toBeVisible();
            await expect(portalFrame.getByText('**** **** **** 4242')).toBeVisible();
        });
    });
});
