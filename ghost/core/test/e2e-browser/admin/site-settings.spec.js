const {expect, test} = require('@playwright/test');
const {createPostDraft, createTier} = require('../utils');

const changeSubscriptionAccess = async (page, access) => {
    // Go to settings page
    await page.locator('[data-test-nav="settings"]').click();

    // Go to members settings page
    await page.locator('[data-test-nav="members-membership"]').click();

    // Change subscription access
    await page.locator('[data-test-members-subscription-access] [data-test-members-subscription-option]').click();
    await page.locator(`[data-test-members-subscription-option="${access}"]`).click();

    // Save settings
    await page.locator('[data-test-button="save-settings"]').click();
    await page.getByRole('button', {name: 'Saved'}).waitFor({
        state: 'visible',
        timeout: 1000
    });
};

const checkPortalScriptLoaded = async (page, loaded = true) => {
    const portalScript = page.locator('script[data-ghost][data-api]');

    if (!loaded) {
        await expect(portalScript).toHaveCount(0);
    } else {
        await expect(portalScript).toHaveAttribute('src', /\/portal.min.js$/);
    }
};

test.describe('Site Settings', () => {
    test.describe('Subscription Access', () => {
        test('Invite only', async ({page}) => {
            await page.goto('/ghost');
            await createTier(page, {
                name: 'Free tier trial',
                monthlyPrice: 100,
                yearlyPrice: 1000,
                trialDays: 5
            }, true);

            await changeSubscriptionAccess(page, 'invite');

            // Go to the sigup page
            await page.goto('/#/portal/signup');

            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');

            // Check sign up is disabled and a message is shown
            await expect(portalFrame.locator('.gh-portal-invite-only-notification')).toHaveText('This site is invite-only, contact the owner for access.');

            // Check free trial message is not shown for invite only
            await expect(portalFrame.locator('.gh-portal-free-trial-notification')).not.toBeVisible();

            // Check portal script loaded (just a negative test for the following test to test the test)
            await checkPortalScriptLoaded(page, true);
        });

        test('Disabled subscription access', async ({page}) => {
            await page.goto('/ghost');

            await changeSubscriptionAccess(page, 'none');

            // Go to the sigup page
            await page.goto('/#/portal/signup');

            // Check Portal not loaded, and thus the signup page is not shown
            await expect(page.locator('#ghost-portal-root div iframe')).toHaveCount(0);
            await checkPortalScriptLoaded(page, false);

            // Check publishing flow is different and has membership features disabled
            await page.goto('/ghost');
            await createPostDraft(page, {
                title: 'Test post',
                body: 'Test post content'
            });
            await page.locator('[data-test-button="publish-flow"]').click();
            await expect(page.locator('[data-test-setting="publish-type"] > button')).toHaveCount(0);
            await expect(page.locator('[data-test-setting="email-recipients"]')).toHaveCount(0);
            // reset back to all
            await page.goto('/ghost');
            await changeSubscriptionAccess(page, 'all');
        });
    });
});
