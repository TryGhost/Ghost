const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createMember, impersonateMember} = require('../utils');

/**
 * @param {import('@playwright/test').Page} page
 */
const addNewsletter = async (page) => {
    await page.goto('/ghost');
    await page.locator('[data-test-nav="settings"]').click();

    // create newsletter
    const section = page.getByTestId('newsletters');
    await section.getByRole('button', {name: 'Add newsletter'}).click();

    const modal = page.getByTestId('add-newsletter-modal');
    await modal.getByLabel('Name').fill('One more newsletter');
    await modal.getByRole('button', {name: 'Create'}).click();

    // check that newsletter was added
    await section.locator('*', {hasText: 'One more newsletter'}).first().waitFor();
};

test.describe('Portal', () => {
    test.describe('Member actions', () => {
        // Use serial mode as the order of tests matters, we create newsletters during the tests
        // TODO: Use a `before` block to create all the requisite newsletters before the tests run
        test.describe.configure({retries: 1, mode: 'serial'});

        test('can log out', async ({sharedPage}) => {
            // create a new free member
            await createMember(sharedPage, {
                name: 'Test Member Signout',
                email: 'test.member.signout@example.com',
                note: 'Test Member'
            });

            // impersonate the member on frontend
            await impersonateMember(sharedPage);

            // open portal
            const portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');

            // sign out
            await portalTriggerButton.click();
            await portalFrame.locator('[data-test-button="footer-signout"]').click();

            // check that sign out was successful and 'Sign in' button is available
            await portalTriggerButton.click();
            await expect(portalFrame.locator('[data-test-button="signin-switch"]')).toBeVisible();
        });

        test('can unsubscribe from newsletter from account settings', async ({sharedPage}) => {
            // create a new free member
            await createMember(sharedPage, {
                name: 'Test Member',
                email: 'test.member@example.com',
                note: 'Test Member'
            });
            //get the url of the current member on admin
            const memberUrl = sharedPage.url();

            // impersonate the member on frontend
            await impersonateMember(sharedPage);

            const portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');

            // open portal
            await portalTriggerButton.click();

            // turn off default newsletter subscription
            const defaultNewsletterToggle = portalFrame.locator('[data-testid="default-newsletter-toggle"]');
            await expect(await defaultNewsletterToggle.isChecked()).toBeTruthy();
            await defaultNewsletterToggle.click();
            await expect(await defaultNewsletterToggle.isChecked()).not.toBeTruthy();

            // check that member's newsletters was updated in Admin
            await sharedPage.waitForLoadState('networkidle');
            await sharedPage.goto(memberUrl);
            await expect(await sharedPage.locator('[data-test-member-settings-switch] input[type=checkbox]').first().isChecked()).not.toBeTruthy();
        });

        test('can unsubscribe from all newsletters from account settings', async ({sharedPage}) => {
            // create a new free member
            await createMember(sharedPage, {
                name: 'Test Member All Unsubscribe',
                email: 'test.member2@example.com',
                note: 'Test Member'
            });
            // get the url of the current member on admin
            const memberUrl = sharedPage.url();

            // add one more newsletter to have multiple
            await addNewsletter(sharedPage);

            // impersonate the member on frontend
            await sharedPage.goto(memberUrl);
            await impersonateMember(sharedPage);

            const portalTriggerButton = sharedPage.frameLocator('[data-testid="portal-trigger-frame"]').locator('[data-testid="portal-trigger-button"]');
            const portalFrame = sharedPage.frameLocator('[data-testid="portal-popup-frame"]');

            // open portal
            await portalTriggerButton.click();
            await portalFrame.locator('[data-test-button="manage-newsletters"]').click();

            // check amount of newsletters
            const newsletters = await portalFrame.locator('.gh-portal-list-toggle-wrapper');
            const count = await newsletters.count();
            await expect(count).toEqual(2);

            // all newsletters should be activated
            for (let i = 0; i < count; i++) {
                await expect(await newsletters.nth(i).locator('input[type="checkbox"]').isChecked()).toBeTruthy();
            }

            // unsubscribe from all emails
            await portalFrame.locator('[data-test-button="unsubscribe-from-all-emails"]').click();

            // todo: replace class locator on data-attr locator
            await expect(portalFrame.locator('.gh-portal-popupnotification.success')).toBeVisible();
            await expect(portalFrame.locator('.gh-portal-popupnotification.success')).toBeHidden();

            // all newsletters should be disabled
            for (let i = 0; i < count; i++) {
                await expect(await newsletters.nth(i).locator('input[type="checkbox"]').isChecked()).not.toBeTruthy();
            }

            // check that member's newsletters was updated in Admin
            await sharedPage.waitForLoadState('networkidle');
            await sharedPage.goto(memberUrl);

            // check amount of newsletters in member's profile in Admin
            await sharedPage.waitForSelector('[data-test-member-settings-switch]');
            const membersNewsletters = await sharedPage.locator('[data-test-member-settings-switch]');
            const newslettersCount = await membersNewsletters.count();
            await expect(newslettersCount).toEqual(2);

            // all newsletters should be disabled
            for (let i = 0; i < newslettersCount; i++) {
                const isNewsletterChecked = await membersNewsletters.nth(i).locator('input[type="checkbox"]').isChecked();
                await expect(isNewsletterChecked).not.toBeTruthy();
            }
        });
    });
});
