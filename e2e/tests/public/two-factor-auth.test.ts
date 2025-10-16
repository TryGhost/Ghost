import {test, expect} from '../../helpers/playwright';
import {AnalyticsOverviewPage, LoginPage, LoginVerifyPage} from '../../helpers/pages/admin';
import {appConfig} from '../../helpers/utils';
import {EmailClient, MailhogClient} from '../../helpers/services/email/MailhogClient';

test.describe('Two-Factor authentication', () => {
    const emailClient: EmailClient = new MailhogClient();

    test.beforeEach(async ({page}) => {
        await new LoginPage(page).logoutByCookieClear();
    });

    test('authenticates with 2FA token', async ({page}) => {
        const {email, password} = appConfig.auth;
        const adminLoginPage = new LoginPage(page);
        await adminLoginPage.goto();
        await adminLoginPage.signIn(email, password);

        const message = await emailClient.searchByContent('verification code');
        const subject = message[0].Content.Headers.Subject[0];
        const code = subject.match(/\d+/)[0];

        const verifyPage = new LoginVerifyPage(page);
        await verifyPage.twoFactorTokenField.fill(code);
        await verifyPage.twoFactorVerifyButton.click();

        const adminAnalyticsPage = new AnalyticsOverviewPage(page);
        await expect(adminAnalyticsPage.header).toBeVisible();
    });
});
