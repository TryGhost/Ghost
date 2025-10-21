import {test, expect} from '../../helpers/playwright';
import {AnalyticsOverviewPage, LoginPage, LoginVerifyPage} from '../../helpers/pages/admin';
import {EmailClient, EmailMessage, MailhogClient} from '../../helpers/services/email/MailhogClient';

test.describe('Two-Factor authentication', () => {
    const emailClient: EmailClient = new MailhogClient();

    function parseCodeFromMessageSubject(messages: EmailMessage[]) {
        if (!messages || messages.length === 0) {
            throw new Error('No messages provided to parse code from');
        }

        const latestMessage = messages[0];
        const subject = latestMessage.Content.Headers.Subject[0];
        const match = subject.match(/\d+/)[0];

        if (!match) {
            throw new Error(`No verification code found in subject: ${subject}`);
        }

        return match;
    }

    test.beforeEach(async ({page}) => {
        const loginPage = new LoginPage(page);
        await loginPage.logoutByCookieClear();
        await loginPage.goto();
    });

    test('authenticates with 2FA token', async ({page, ghostAccountOwner}) => {
        const {email, password} = ghostAccountOwner;
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

    test('authenticates with 2FA token that was resent', async ({page, ghostAccountOwner}) => {
        const {email, password} = ghostAccountOwner;
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
