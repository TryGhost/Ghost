const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createPostDraft, createTier, disconnectStripe, generateStripeIntegrationToken, setupStripe, getStripeAccountId} = require('../utils');

const changeSubscriptionAccess = async (page, access) => {
    await page.locator('[data-test-nav="settings"]').click();

    const section = page.getByTestId('access');
    const select = section.getByTestId('subscription-access-select');

    await select.click();
    await page.locator(`[data-testid="select-option"][data-value="${access}"]`).click();

    // Save settings
    await section.getByRole('button', {name: 'Save'}).click();

    await expect(select).toContainText(
        access === 'all' ? 'Anyone can sign up' :
            access === 'invite' ? 'Invite-only' :
                access === 'paid' ? 'Paid-members only' :
                    'Nobody'
    );
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
        test('Invite only', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');
            await createTier(sharedPage, {
                name: 'Free tier trial',
                monthlyPrice: 100,
                yearlyPrice: 1000,
                trialDays: 5
            }, true);

            await changeSubscriptionAccess(sharedPage, 'invite');

            // Go to the sigup page
            await sharedPage.goto('/#/portal/signup');

            const portalFrame = sharedPage.frameLocator('#ghost-portal-root div iframe');

            // Check sign up is disabled and a message is shown
            await expect(portalFrame.locator('.gh-portal-section')).toHaveText(/contact the owner for access/);

            // Check free trial message is not shown for invite only
            await expect(portalFrame.locator('.gh-portal-free-trial-notification')).not.toBeVisible();
        });

        test('Disabled subscription access', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');

            await changeSubscriptionAccess(sharedPage, 'none');

            // Go to the signup page
            await sharedPage.goto('/#/portal/signup');

            // Check publishing flow is different and has membership features disabled
            await sharedPage.goto('/ghost');
            await createPostDraft(sharedPage, {
                title: 'Test post',
                body: 'Test post content'
            });
            await sharedPage.locator('[data-test-button="publish-flow"]').first().click();

            await expect(sharedPage.locator('[data-test-setting="publish-type"] > button')).toHaveCount(0);
            await expect(sharedPage.locator('[data-test-setting="email-recipients"]')).toHaveCount(0);
        });
    });

    test.describe('Portal script', () => {
        test('Portal loads if Memberships are enabled', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');

            // Enable Memberships
            await changeSubscriptionAccess(sharedPage, 'all');

            // Go to the signup page
            await sharedPage.goto('/#/portal/signup');

            // Portal should load
            await expect(sharedPage.locator('#ghost-portal-root div iframe')).toHaveCount(1);
            await checkPortalScriptLoaded(sharedPage, true);
        });

        test('Portal loads if Tips & Donations are enabled (Stripe connected)', async ({sharedPage}) => {
            await sharedPage.goto('/ghost');

            // Disable Memberships
            await changeSubscriptionAccess(sharedPage, 'none');

            // Go to the signup page
            await sharedPage.goto('/#/portal/signup');

            // Portal should load
            await expect(sharedPage.locator('#ghost-portal-root div iframe')).toHaveCount(1);
            await checkPortalScriptLoaded(sharedPage, true);

            // Reset
            await sharedPage.goto('/ghost');
            await changeSubscriptionAccess(sharedPage, 'all');
        });

        test('Portal does not load if both Memberships and Tips & Donations are disabled', async ({sharedPage}) => {
            // Disconnect stripe first, which will disable Tips & Donations
            await sharedPage.goto('/ghost');
            await disconnectStripe(sharedPage);

            // Disable Memberships
            await sharedPage.goto('/ghost');
            await changeSubscriptionAccess(sharedPage, 'none');

            // Go to the signup page
            await sharedPage.goto('/#/portal/signup');

            // Portal should not load
            await expect(sharedPage.locator('#ghost-portal-root div iframe')).toHaveCount(0);
            await checkPortalScriptLoaded(sharedPage, false);

            // Reset subscription access & re-connect Stripe
            await sharedPage.goto('/ghost');
            await changeSubscriptionAccess(sharedPage, 'all');

            await sharedPage.goto('/ghost');
            const stripeAccountId = await getStripeAccountId();
            const stripeToken = await generateStripeIntegrationToken(stripeAccountId);
            await setupStripe(sharedPage, stripeToken);
        });
    });
});
