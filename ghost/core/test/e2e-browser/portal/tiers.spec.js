const {expect, test} = require('@playwright/test');
const {deleteAllMembers, completeStripeSubscription} = require('../utils');

test.describe('Portal', () => {
    test.describe('Tiers', () => {
        test('Sign up for paid plan via portal - single tier', async ({page}) => {
            // make sure we have no members to start fresh
            await page.goto('/ghost');
            await deleteAllMembers(page);

            // go to website and open portal
            await page.goto('/');
            const portalTriggerButton = page.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');
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
            await completeStripeSubscription(page);

            // come back to the website, open portal and check member is logged in and has paid
            await portalTriggerButton.click();
            await expect(portalFrame.getByText('testy+paidsignup@example.com')).toBeVisible();
            await expect(portalFrame.getByRole('heading', {name: 'Billing info'})).toBeVisible();
            await expect(portalFrame.getByText('**** **** **** 4242')).toBeVisible();
        });
    });
});
