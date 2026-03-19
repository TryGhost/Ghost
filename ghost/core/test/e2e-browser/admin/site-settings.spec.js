const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');
const {createPostDraft} = require('../utils');

const changeSubscriptionAccess = async (page, access) => {
    await page.getByRole('navigation').getByRole('link', {name: 'Settings'}).click();

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

test.describe('Site Settings', () => {
    test.describe('Subscription Access', () => {
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
});
