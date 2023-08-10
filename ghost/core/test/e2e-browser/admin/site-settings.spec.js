const {expect, test} = require('@playwright/test');
const {createPostDraft, createTier, disconnectStripe, generateStripeIntegrationToken, setupStripe} = require('../utils');

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
        });

        test('Disabled subscription access', async ({page}) => {
            await page.goto('/ghost');

            await changeSubscriptionAccess(page, 'none');

            // Go to the signup page
            await page.goto('/#/portal/signup');

            // Check publishing flow is different and has membership features disabled
            await page.goto('/ghost');
            await createPostDraft(page, {
                title: 'Test post',
                body: 'Test post content'
            });
            await page.locator('[data-test-button="publish-flow"]').click();
            await expect(page.locator('[data-test-setting="publish-type"] > button')).toHaveCount(0);
            await expect(page.locator('[data-test-setting="email-recipients"]')).toHaveCount(0);
        });
    });

    test.describe('Portal script', () => {
        test('Portal loads if Memberships are enabled', async ({page}) => {
            await page.goto('/ghost');

            // Enable Memberships
            await changeSubscriptionAccess(page, 'all');

            // Go to the signup page
            await page.goto('/#/portal/signup');

            // Portal should load
            await expect(page.locator('#ghost-portal-root div iframe')).toHaveCount(1);
            await checkPortalScriptLoaded(page, true);
        });

        test('Portal loads if Tips & Donations are enabled (Stripe connected)', async ({page}) => {
            await page.goto('/ghost');

            // Disable Memberships
            await changeSubscriptionAccess(page, 'none');

            // Go to the signup page
            await page.goto('/#/portal/signup');

            // Portal should load
            await expect(page.locator('#ghost-portal-root div iframe')).toHaveCount(1);
            await checkPortalScriptLoaded(page, true);

            // Reset
            await page.goto('/ghost');
            await changeSubscriptionAccess(page, 'all');
        });

        test('Portal does not load if both Memberships and Tips & Donations are disabled', async ({page}) => {
            // Disconnect stripe first, which will disable Tips & Donations
            await page.goto('/ghost');
            await disconnectStripe(page);

            // Disable Memberships
            await page.goto('/ghost');
            await changeSubscriptionAccess(page, 'none');

            // Go to the signup page
            await page.goto('/#/portal/signup');

            // Portal should not load
            await expect(page.locator('#ghost-portal-root div iframe')).toHaveCount(0);
            await checkPortalScriptLoaded(page, false);

            // Reset subscription access & re-connect Stripe
            await page.goto('/ghost');
            await changeSubscriptionAccess(page, 'all');

            await page.goto('/ghost');
            const stripeToken = await generateStripeIntegrationToken();
            await setupStripe(page, stripeToken);
        });
    });
});
