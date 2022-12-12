const {expect, test} = require('@playwright/test');
const {deleteAllMembers, completeStripeSubscription} = require('../utils');

test.describe('Portal', () => {
    test.describe('Tiers', () => {
        test('Sign up for paid plan via portal - single tier', async ({page}) => {
            // make sure we have no members to start fresh
            page.goto('/ghost');
            await deleteAllMembers(page);

            // go to website and open portal
            await page.goto('/');
            const portalTriggerButton = page.frameLocator('#ghost-portal-root iframe.gh-portal-triggerbtn-iframe').locator('div').nth(1);
            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');
            await portalTriggerButton.click();

            // fill out signup form and submit
            await portalFrame.locator('[data-test-input="input-name"]').fill('Testy McTesterson');
            await portalFrame.locator('[data-test-input="input-email"]').fill('testy@example.com');
            await portalFrame.locator('[data-test-button="select-tier"]').nth(1).click();
            const hasContinueBtn = await portalFrame.locator('text="Continue"').isVisible();
            if (hasContinueBtn) {
                await portalFrame.getByRole('button', {name: 'Continue'}).click();
            }
            // complete the stripe checkout flow
            await completeStripeSubscription(page);

            // come back to the website, open portal and check member is logged in and has paid
            await page.waitForSelector('h1.site-title', {state: 'visible'});
            await portalTriggerButton.click();
            await expect(portalFrame.getByText('testy@example.com')).toBeVisible();
            await expect(portalFrame.getByRole('heading', {name: 'Billing info'})).toBeVisible();
            await expect(portalFrame.getByText('**** **** **** 4242')).toBeVisible();
        });
    });
});
