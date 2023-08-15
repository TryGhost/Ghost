const {expect, test} = require('@playwright/test');
const {createMember, impersonateMember, completeStripeSubscription} = require('../utils');

test.describe('Portal', () => {
    test.describe('Donations', () => {
        test('Can donate as an anonymous member', async ({page}) => {
            // go to website and open portal
            await page.goto('/#/portal/support');

            await page.locator('#customUnitAmount').fill('12.50');
            await page.locator('#email').fill('member-donation-test-1@ghost.org');
            await completeStripeSubscription(page);

            // Check success message
            const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');
            await expect(portalFrame.getByText('Thank you!')).toBeVisible();
        });

        // This test is broken because the impersonate is not working!
        test('Can donate as a logged in free member', async ({page}) => {
            // create a new free member
            await createMember(page, {
                name: 'Test Member Donations',
                email: 'test.member.donations@example.com',
                note: 'Test Member'
            });

            // impersonate the member on frontend
            await impersonateMember(page);

            await page.goto('#/portal/support');

            // Don't need to fill email as it's already filled
            await page.locator('#customUnitAmount').fill('12.50');
            await completeStripeSubscription(page);

            // Check success message
            const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');
            await expect(portalFrame.getByText('Thank you!')).toBeVisible();
        });

        test('Can donate with a fixed amount set and different currency', async ({page}) => {
            await page.goto('/ghost/#/settings/members');
            await page.getByTestId('expand-tips-and-donations').click();
            await page.getByTestId('tips-and-donations-amount').fill('98');
            await page.locator('#gh-tips-and-donations-currency').selectOption('EUR');
            await page.locator('[data-test-button="save-settings"]').click();

            // go to website and open portal
            await page.goto('/#/portal/support');

            await page.locator('#email').fill('member-donation-test-3@ghost.org');

            const totalAmount = page.getByTestId('product-summary-total-amount');
            await expect(totalAmount).toHaveText('€98.00');

            await completeStripeSubscription(page);

            // Check success message
            const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');
            await expect(portalFrame.getByText('Thank you!')).toBeVisible();
        });
    });
});
