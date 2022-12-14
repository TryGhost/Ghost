const {expect, test} = require('@playwright/test');
const {completeStripeSubscription, createMember, archiveAllTiers, createTier, impersonateMember} = require('../utils');

test.describe('Portal', () => {
    test.describe('Upgrade: Single Tier', () => {
        let memberUrl;
        const tier = {
            name: 'Test tier',
            monthlyPrice: 5,
            yearlyPrice: 50
        };
        const member = {
            name: 'Testy McTest',
            email: 'testy+upgradeportal@example.com',
            note: 'Testy McTest is a test member'
        };

        test('allows free member upgrade to paid tier', async ({page}) => {
            // archive all existing tiers for fresh setup
            await page.goto('/ghost');
            await archiveAllTiers(page);

            // create a new tier
            await page.goto('/ghost');
            await createTier(page, tier);

            // create a new free member
            await page.goto('/ghost');
            await createMember(page, member);

            //store the url of the member detail page
            memberUrl = await page.url();

            // impersonate the member on frontend
            impersonateMember(page);

            const portalTriggerButton = page.frameLocator('#ghost-portal-root iframe.gh-portal-triggerbtn-iframe').locator('div').nth(1);
            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');

            // open portal, go to plans and click continue to select the first plan(yearly)
            await portalTriggerButton.click();
            // verify the member we created is logged in
            await expect(portalFrame.getByText('testy+upgradeportal@example.com')).toBeVisible();
            // view plans button only shows for free member
            await portalFrame.getByRole('button', {name: 'View plans'}).click();
            // select the default tier for checkout (yearly)
            await portalFrame.locator('[data-test-button="select-tier"]').first().click();
            // complete stripe checkout
            await completeStripeSubscription(page);

            // open portal and check that member has been upgraded to paid tier
            await portalTriggerButton.click();
            // verify member's tier, price and card details
            await expect(portalFrame.getByText('Test tier')).toBeVisible();
            await expect(portalFrame.getByText('$50.00/year')).toBeVisible();
            await expect(portalFrame.getByText('**** **** **** 4242')).toBeVisible();

            // verify member's tier on member detail page in admin
            await page.goto(memberUrl);
            const tierCard = await page.locator('[data-test-tier]').first();
            const tierText = await tierCard.locator('[data-test-text="tier-name"]');
            await expect(tierCard).toBeVisible();
            await expect(tierText, 'Where is tier text').toHaveText(/Test tier/);
        });

        test('allows member to switch plans', async ({page}) => {
            // go to member detail page in admin
            await page.goto(memberUrl);

            // impersonate the member on frontend
            impersonateMember(page);

            const portalTriggerButton = page.frameLocator('#ghost-portal-root iframe.gh-portal-triggerbtn-iframe').locator('div').nth(1);
            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');

            // open portal
            await portalTriggerButton.click();

            // test member can switch to monthly plan from yearly
            // await portalFrame.getByRole('button', {name: 'Change'}).click();
            await portalFrame.locator('[data-test-button="change-plan"]').click();
            // await portalFrame.getByRole('button', {name: 'Monthly'}).click();
            await portalFrame.locator('[data-test-button="switch-monthly"]').click();
            // await portalFrame.locator('.gh-portal-btn-product .gh-portal-btn').first().click();
            // select the monthly plan
            await portalFrame.locator('[data-test-button="select-tier"]').first().click();
            // await portalFrame.getByRole('button', {name: 'Confirm'}).click();
            // confirm the switch
            await portalFrame.locator('[data-test-button="confirm-action"]').first().click();
            // verify member has switched to monthly plan
            await expect(portalFrame.getByText('Test tier')).toBeVisible({timeout: 10000});
            await expect(portalFrame.getByText('$5.00/month')).toBeVisible({timeout: 10000});

            // test member can switch back to yearly
            await portalFrame.locator('[data-test-button="change-plan"]').click();
            await portalFrame.locator('[data-test-button="switch-yearly"]').click();
            // select the monthly plan
            await portalFrame.locator('[data-test-button="select-tier"]').first().click();
            // confirm the switch
            await portalFrame.locator('[data-test-button="confirm-action"]').first().click();
            // verify member has switched to yearly plan, timeout added to allow for delays
            await expect(portalFrame.getByText('Test tier')).toBeVisible({timeout: 10000});
            await expect(portalFrame.getByText('$50.00/year')).toBeVisible({timeout: 10000});
        });

        test('allows comped member to upgrade to paid tier', async ({page}) => {
            // create a new free member
            await createMember(page, {
                name: 'Testy McTest',
                email: 'testy+upgradecompedportal@example.com',
                note: 'Testy McTest is a test member'
            });

            //get the url of the current member on admin
            memberUrl = await page.url();

            // Give member comped subscription
            await page.locator('[data-test-button="add-complimentary"]').click();
            await page.locator('[data-test-button="save-comp-tier"]').first().click({
                delay: 500
            });

            // open member impersonation modal
            await page.locator('[data-test-button="member-actions"]').click();
            await page.locator('[data-test-button="impersonate"]').click();
            await page.locator('[data-test-button="copy-impersonate-link"]').click();
            await page.waitForSelector('[data-test-button="copy-impersonate-link"] span:has-text("Link copied")');

            // get impersonation link from input and redirect to it
            const link = await page.locator('[data-test-input="member-signin-url"]').inputValue();
            await page.goto(link);

            const portalTriggerButton = page.frameLocator('#ghost-portal-root iframe.gh-portal-triggerbtn-iframe').locator('div').nth(1);
            const portalFrame = page.frameLocator('#ghost-portal-root div iframe');

            // open portal, go to plans and click continue to select the first plan(yearly)
            await portalTriggerButton.click();
            await portalFrame.getByRole('button', {name: 'Change'}).click();
            await portalFrame.locator('[data-test-button="select-tier"]').first().click();

            // complete stripe checkout
            await completeStripeSubscription(page);

            // open portal and check that member has been upgraded to paid tier
            await portalTriggerButton.click();
            await expect(portalFrame.getByText('$50.00/year')).toBeVisible();
            await expect(portalFrame.getByRole('heading', {name: 'Billing info'})).toBeVisible();
            await expect(portalFrame.getByText('**** **** **** 4242')).toBeVisible();

            // check that member has been upgraded in admin and a tier exists for them
            await page.goto(memberUrl);
            await expect(page.locator('[data-test-tier]').first()).toBeVisible();
        });
    });
});
