import {test, expect} from '../../helpers/playwright';
import {AnalyticsOverviewPage, LoginPage, LoginVerifyPage} from '../../helpers/pages/admin';
import {appConfig} from '../../helpers/utils';
import {EmailClient, EmailMessage, MailhogClient} from '../../helpers/services/email/MailhogClient';

test.describe('Two-Factor authentication', () => {
    const emailClient: EmailClient = new MailhogClient();

    function parseCodeFromMessageSubject(messages: EmailMessage[]) {
        const latestMessage = messages[0];
        const subject = latestMessage.Content.Headers.Subject[0];
        return subject.match(/\d+/)[0];
    }

    test.beforeEach(async ({page}) => {
        const loginPage = new LoginPage(page);
        await loginPage.logoutByCookieClear();
        await loginPage.goto();
    });

    test('authenticates with 2FA token', async ({page}) => {
        const {email, password} = appConfig.auth;
        const adminLoginPage = new LoginPage(page);
        await adminLoginPage.goto();
        await adminLoginPage.signIn(email, password);

        const messages = await emailClient.searchByContent('verification code');
        const code = parseCodeFromMessageSubject(messages);

        const verifyPage = new LoginVerifyPage(page);
        await verifyPage.twoFactorTokenField.fill(code);
        await verifyPage.twoFactorVerifyButton.click();

        const adminAnalyticsPage = new AnalyticsOverviewPage(page);
        await expect(adminAnalyticsPage.header).toBeVisible();
    });

    test('authenticates with 2FA token that was resent', async ({page}) => {
        const {email, password} = appConfig.auth;
        const adminLoginPage = new LoginPage(page);
        await adminLoginPage.goto();
        await adminLoginPage.signIn(email, password);

        let messages = await emailClient.searchByContent('verification code');
        expect(messages.length).toBe(1);

        const verifyPage = new LoginVerifyPage(page);
        await verifyPage.resendTwoFactorCodeButton.click();

        messages = await emailClient.searchByContent('verification code', {numberOfMessages: 2});
        const code = parseCodeFromMessageSubject(messages);
        expect(messages.length).toBe(2);

        await verifyPage.twoFactorTokenField.fill(code);
        await verifyPage.twoFactorVerifyButton.click();

        const adminAnalyticsPage = new AnalyticsOverviewPage(page);
        await expect(adminAnalyticsPage.header).toBeVisible();
    });
});
