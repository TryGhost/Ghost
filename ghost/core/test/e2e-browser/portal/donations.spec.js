const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createMember, impersonateMember, completeStripeSubscription} = require('../utils');

test.describe('Portal', () => {
    test.describe('Donations', () => {
        test('Can donate as an anonymous member', async ({sharedPage}) => {
            // go to website and open portal
            await sharedPage.goto('/#/portal/support');

            const totalAmount = sharedPage.getByTestId('product-summary-total-amount');
            await expect(totalAmount).toHaveText('$5.00');
            await sharedPage.getByText('Change amount').click();
            await sharedPage.locator('#customUnitAmount').fill('12.50');
            await sharedPage.locator('#email').fill('member-donation-test-1@ghost.org');
            await completeStripeSubscription(sharedPage);

            await sharedPage.pause();
            // Check success modal
            await sharedPage.waitForSelector('[data-testid="portal-popup-frame"]', {state: 'visible'});
            const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            await expect(portalFrame.getByText('Thank you for your support')).toBeVisible();
            // Modal has working subscribe action
            await portalFrame.getByText('Sign up').click();
            await expect(portalFrame.locator('.gh-portal-signup')).toBeVisible();
        });

        test('Can donate as a logged in free member', async ({sharedPage}) => {
            // create a new free member
            await createMember(sharedPage, {
                name: 'Test Member Donations',
                email: 'test.member.donations@example.com',
                note: 'Test Member'
            });

            // impersonate the member on frontend
            await impersonateMember(sharedPage);

            await sharedPage.goto('#/portal/support');

            // Don't need to fill email as it's already filled
            await sharedPage.getByText('Change amount').click();
            await sharedPage.locator('#customUnitAmount').fill('12.50');
            await completeStripeSubscription(sharedPage);

            // Check success notification
            const notificationFrame = sharedPage.frameLocator('[data-testid="portal-notification-frame"]');
            // todo: replace class locator on data-attr locator
            await expect(notificationFrame.locator('.gh-portal-notification.success')).toHaveCount(1);
        });

        test('Can donate with a fixed amount set and different currency', async ({sharedPage}) => {
            await sharedPage.goto('/ghost/#/settings');

            const section = sharedPage.getByTestId('tips-and-donations');

            await section.getByRole('button', {name: 'Edit'}).click();
            await section.getByLabel('Suggested amount').fill('98');
            const select = section.getByLabel('Currency');
            await select.click();
            await sharedPage.locator(`[data-testid="select-option"][data-value="EUR"]`).click();
            await section.getByRole('button', {name: 'Save'}).click();
            await expect(select).not.toBeVisible();

            // go to website and open portal
            await sharedPage.goto('/#/portal/support');

            await sharedPage.locator('#email').fill('member-donation-test-3@ghost.org');

            const totalAmount = sharedPage.getByTestId('product-summary-total-amount');
            await expect(totalAmount).toHaveText('€98.00');

            await completeStripeSubscription(sharedPage);

            // Check success message
            await sharedPage.waitForSelector('[data-testid="portal-popup-frame"]', {state: 'visible'});
            const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');
            await expect(portalFrame.getByText('Thank you for your support')).toBeVisible();
        });
    });
});
