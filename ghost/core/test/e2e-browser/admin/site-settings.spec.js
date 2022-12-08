const {expect, test} = require('@playwright/test');

const changeSubscriptionAccess = async (page, access) => {
    await page.locator('[data-test-nav="settings"]').click();
    await page.locator('[data-test-nav="members-membership"]').click();

    // click data-test-members-subscription-option="all"
    await page.locator('[data-test-members-subscription-option="all"]').click();
    await page.locator(`[data-test-members-subscription-option="${access}"]`).click();

    // save
    await page.locator('[data-test-button="save-settings"]').click();
};

test.describe('Site Settings', () => {
    test.describe('Subscription Access', () => {
        test('Invite only', async ({page}) => {
            await page.goto('/ghost');

            await changeSubscriptionAccess(page, 'invite');

            // Go to the sigup page
            await page.goto('/#/portal/signup');

            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');

            // Check sign up is disabled and a message is shown
            await expect(portalFrame.locator('.gh-portal-invite-only-notification')).toHaveText('This site is invite-only, contact the owner for access.');
        });
    });
});
