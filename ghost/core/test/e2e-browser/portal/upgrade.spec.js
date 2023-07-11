const {expect, test} = require('@playwright/test');
const {completeStripeSubscription, createMember, impersonateMember} = require('../utils');

test.describe('Portal', () => {
    test.describe('Upgrade: Comped Member', () => {
        test('allows comped member to upgrade to paid tier', async ({page}) => {
            const tierName = 'The Local Test';

            // create a new member
            await page.goto('/ghost');
            await createMember(page, {
                name: 'Testy McTest',
                email: 'testy+upgradecompedportal@example.com',
                note: 'Testy McTest is a test member'
            });

            //get the url of the current member on admin
            const memberUrl = page.url();

            // Give member comped subscription
            await page.locator('[data-test-button="add-complimentary"]').click();
            await page.locator('[data-test-button="save-comp-tier"]').first().click({
                delay: 500
            });

            await page.waitForLoadState('networkidle');
            await impersonateMember(page);

            const portalTriggerButton = page.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');
            //await page.pause();

            // open portal, go to plans and click continue to select the first plan(yearly)
            await portalTriggerButton.click();
            await portalFrame.getByRole('button', {name: 'Change'}).click();

            // select the tier for checkout (yearly)
            await choseTierByName(portalFrame, tierName);

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

    test.describe('Upgrade: Single Tier', () => {
        let memberUrl;
        const tierName = 'The Local Test';
        const member = {
            name: 'Testy McTest',
            email: 'testy+upgradeportal@example.com',
            note: 'Testy McTest is a test member'
        };

        test('allows free member upgrade to paid tier', async ({page}) => {
            await page.goto('/ghost');

            // create a new free member
            await page.goto('/ghost');
            await createMember(page, member);

            //store the url of the member detail page
            memberUrl = page.url();

            // impersonate the member on frontend
            await impersonateMember(page);

            const portalTriggerButton = page.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');

            // open portal, go to plans and click continue to select the first plan(yearly)
            await portalTriggerButton.click();
            // verify the member we created is logged in
            await expect(portalFrame.getByText('testy+upgradeportal@example.com')).toBeVisible();
            // view plans button only shows for free member
            await portalFrame.getByRole('button', {name: 'View plans'}).click();

            // select the tier for checkout (yearly)
            await choseTierByName(portalFrame, tierName);

            // complete stripe checkout
            await completeStripeSubscription(page);

            // open portal and check that member has been upgraded to paid tier
            await portalTriggerButton.click();
            // verify member's tier, price and card details
            await expect(portalFrame.getByText(tierName)).toBeVisible();
            await expect(portalFrame.getByText('$50.00/year')).toBeVisible();
            await expect(portalFrame.getByText('**** **** **** 4242')).toBeVisible();

            // verify member's tier on member detail page in admin
            await page.goto(memberUrl);
            const tierCard = await page.locator('[data-test-tier]').first();
            const tierText = await tierCard.locator('[data-test-text="tier-name"]');
            await expect(tierCard).toBeVisible();
            await expect(tierText, 'Where is tier text').toHaveText(new RegExp(tierName));
        });

        test('allows member to switch plans', async ({page}) => {
            // go to member detail page in admin
            await page.goto(memberUrl);

            // impersonate the member on frontend
            await impersonateMember(page);

            const portalTriggerButton = page.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = page.frameLocator('[data-testid="portal-popup-frame"]');

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

async function choseTierByName(portalFrame, tierName) {
    const portalTierCard = await portalFrame.locator('[data-test-tier="paid"]').filter({hasText: tierName}).first();
    await portalTierCard.locator('[data-test-button="select-tier"]').click();
}
