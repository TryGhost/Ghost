const {expect, test} = require('@playwright/test');
const {completeStripeSubscription, createMember} = require('../utils');

test.describe('Portal', () => {
    test.describe('Upgrade', () => {
        test('allows free member upgrade to paid tier', async ({page}) => {
            // await page.goto('/ghost');
            // create a new member
            await createMember(page, {
                name: 'Testy McTest',
                email: 'testy@example.com',
                note: 'Testy McTest is a test member'
            });
            //get the url of the current member on admin
            const memberUrl = await page.url();
            // add yourself as a free member so you can impersonate
            // await page.locator('.gh-nav a[href="#/members/"]').click();
            // await page.locator('[data-test-button="add-yourself"]').click();

            // open first member in list which should be yourself
            // await page.locator('[data-test-list="members-list-item"]').first().click();
            //get the url of the current page
            // const memberUrl = await page.url();

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
            // view plans button only shows for free member
            await portalFrame.getByRole('button', {name: 'View plans'}).click();
            await portalFrame.getByRole('button', {name: 'Continue'}).click();

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
