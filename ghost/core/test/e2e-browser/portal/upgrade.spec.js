const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {completeStripeSubscription, createMember, createTier, impersonateMember} = require('../utils');

const tierName = 'Upgrade Tests';

test.describe('Portal', () => {
    test.describe('Upgrades', () => {
        // Tier created in first test used in subsequent tests
        test.describe.configure({mode: 'serial'});

        test.describe('Upgrade: Comped Member', () => {
            test('allows comped member to upgrade to paid tier', async ({sharedPage}) => {
                // create a new member
                await sharedPage.goto('/ghost');
                await createTier(sharedPage, {
                    name: tierName,
                    monthlyPrice: 5,
                    yearlyPrice: 50
                });
                await createMember(sharedPage, {
                    name: 'Testy McTest',
                    email: 'testy+upgradecompedportal@example.com',
                    note: 'Testy McTest is a test member'
                });

                //get the url of the current member on admin
                const memberUrl = sharedPage.url();

                // Give member comped subscription
                await sharedPage.locator('[data-test-button="add-complimentary"]').click();
                await sharedPage.locator('[data-test-button="save-comp-tier"]').first().click({
                    delay: 500
                });

                await sharedPage.waitForLoadState('networkidle');
                await impersonateMember(sharedPage);

                const portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
                const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');

                // open portal, go to plans and click continue to select the first plan(yearly)
                await portalTriggerButton.click();
                await portalFrame.getByRole('button', {name: 'Change'}).click();

                // select the tier for checkout (yearly)
                await choseTierByName(portalFrame, tierName);

                // complete stripe checkout
                await completeStripeSubscription(sharedPage);

                // open portal and check that member has been upgraded to paid tier
                await portalTriggerButton.click();
                await expect(portalFrame.getByText('$50.00/year')).toBeVisible();
                await expect(portalFrame.getByRole('heading', {name: 'Billing info'})).toBeVisible();
                await expect(portalFrame.getByText('**** **** **** 4242')).toBeVisible();

                // check that member has been upgraded in admin and a tier exists for them
                await sharedPage.goto(memberUrl);
                await expect(sharedPage.locator('[data-test-tier]').first()).toBeVisible();
            });
        });

        test.describe('Upgrade: Single Tier', () => {
            // Because memberUrl is set during first test, we need to run these tests in series
            test.describe.configure({mode: 'serial'});

            let memberUrl;
            const member = {
                name: 'Testy McTest',
                email: 'testy+upgradeportal@example.com',
                note: 'Testy McTest is a test member'
            };

            test('allows free member upgrade to paid tier', async ({sharedPage}) => {
                await sharedPage.goto('/ghost');

                // create a new free member
                await sharedPage.goto('/ghost');
                await createMember(sharedPage, member);

                //store the url of the member detail page
                memberUrl = sharedPage.url();

                // impersonate the member on frontend
                await impersonateMember(sharedPage);

                const portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
                const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');

                // open portal, go to plans and click continue to select the first plan(yearly)
                await portalTriggerButton.click();
                // verify the member we created is logged in
                await expect(portalFrame.getByText('testy+upgradeportal@example.com')).toBeVisible();
                // view plans button only shows for free member
                await portalFrame.getByRole('button', {name: 'View plans'}).click();

                // select the tier for checkout (yearly)
                await choseTierByName(portalFrame, tierName);

                // complete stripe checkout
                await completeStripeSubscription(sharedPage);

                // open portal and check that member has been upgraded to paid tier
                await portalTriggerButton.click();
                // verify member's tier, price and card details
                await expect(portalFrame.getByText(tierName)).toBeVisible();
                await expect(portalFrame.getByText('$50.00/year')).toBeVisible();
                await expect(portalFrame.getByText('**** **** **** 4242')).toBeVisible();

                // verify member's tier on member detail page in admin
                await sharedPage.goto(memberUrl);
                const tierCard = await sharedPage.locator('[data-test-tier]').first();
                const tierText = await tierCard.locator('[data-test-text="tier-name"]');
                await expect(tierCard).toBeVisible();
                await expect(tierText, 'Where is tier text').toHaveText(new RegExp(tierName));
            });

            test('allows member to switch plans', async ({sharedPage}) => {
                // go to member detail page in admin
                await sharedPage.goto(memberUrl);

                // impersonate the member on frontend
                await impersonateMember(sharedPage);

                const portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
                const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');

                // open portal
                await portalTriggerButton.click();

                // test member can switch to monthly plan from yearly
                await portalFrame.locator('[data-test-button="change-plan"]').click();

                await portalFrame.locator('[data-test-button="switch-monthly"]').click();

                // select the monthly plan
                await choseTierByName(portalFrame, tierName);

                // confirm the switch
                await portalFrame.locator('[data-test-button="confirm-action"]').first().click();
                // verify member has switched to monthly plan
                await expect(portalFrame.getByText(tierName)).toBeVisible();
                await expect(portalFrame.getByText('$5.00/month')).toBeVisible();

                // test member can switch back to yearly
                await portalFrame.locator('[data-test-button="change-plan"]').click();
                await portalFrame.locator('[data-test-button="switch-yearly"]').click();
                // select the monthly plan
                await choseTierByName(portalFrame, tierName);
                // confirm the switch
                await portalFrame.locator('[data-test-button="confirm-action"]').first().click();
                // verify member has switched to yearly plan, timeout added to allow for delays
                await expect(portalFrame.getByText(tierName)).toBeVisible();
                await expect(portalFrame.getByText('$50.00/year')).toBeVisible();
            });
        });
    });
});

async function choseTierByName(portalFrame, tier) {
    const portalTierCard = await portalFrame.locator('[data-test-tier="paid"]').filter({hasText: tier}).first();
    await portalTierCard.locator('[data-test-button="select-tier"]').click();
}
