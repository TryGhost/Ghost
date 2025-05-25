const DataGenerator = require('../../utils/fixtures/data-generator');
const {expect} = require('@playwright/test');
const test = require('../fixtures/ghost-test');

const {
    AdminLoginPage,
    AdminDashboardPage
} = require('./pages/index');

// NOTE: The tests do not use the shared page, as it needs to clear cookies
test.describe('Two-Factor authentication', () => {
    function fetchOwnerUserFixture() {
        return DataGenerator.Content.users.find(user => user.id === '1');
    }

    test.beforeEach(async ({page}) => {
        await new AdminLoginPage(page).logoutByCookieClear();
    });

    test('Authenticating with 2FA token works', async ({page, verificationToken}) => {
        const {email, password} = fetchOwnerUserFixture();

        const adminLoginPage = new AdminLoginPage(page);
        await adminLoginPage.visit();
        await adminLoginPage.signIn(email, password);
        await adminLoginPage.verifyTwoFactorToken(await verificationToken.getToken());

        const adminDashboardPage = new AdminDashboardPage(page);
        await expect(adminDashboardPage.siteTitle).toHaveText(/The Local Test/);
    });

    test('Clicking the resend button sends a second email', async ({page, verificationToken}) => {
        const {email, password} = fetchOwnerUserFixture();

        const adminLoginPage = new AdminLoginPage(page);
        await adminLoginPage.visit();
        await adminLoginPage.signIn(email, password);
        await adminLoginPage.resendTwoFactorToken();
        await expect(adminLoginPage.sentTwoFactorCodeButton).toBeVisible();

        await adminLoginPage.verifyTwoFactorToken(await verificationToken.getToken());

        const adminDashboardPage = new AdminDashboardPage(page);
        await expect(adminDashboardPage.siteTitle).toHaveText(/The Local Test/);
    });
});
