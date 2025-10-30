import {AnalyticsOverviewPage, LoginPage, LoginVerifyPage} from '../../helpers/pages/admin';
import {EmailClient, EmailMessage,MailPit} from '../../helpers/services/email/MailPit';
import {expect, test} from '../../helpers/playwright';

test.describe('Two-Factor authentication', () => {
    const emailClient: EmailClient = new MailPit();

    function parseCodeFromMessageSubject(message: EmailMessage) {
        const subject = message.Subject;
        const match = subject.match(/\d+/);

        if (!match) {
            throw new Error(`No verification code found in subject: ${subject}`);
        }

        return match[0];
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

        const messages = await emailClient.search({
            subject: 'verification code',
            to: ghostAccountOwner.email
        });
        const code = parseCodeFromMessageSubject(messages[0]);

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

        let messages = await emailClient.search({
            subject: 'verification code',
            to: ghostAccountOwner.email
        });
        expect(messages.length).toBe(1);

        const verifyPage = new LoginVerifyPage(page);
        await verifyPage.resendTwoFactorCodeButton.click();

        messages = await emailClient.search({
            subject: 'verification code',
            to: ghostAccountOwner.email
        }, {numberOfMessages: 2});

        expect(messages.length).toBe(2);

        const code = parseCodeFromMessageSubject(messages[0]);
        await verifyPage.twoFactorTokenField.fill(code);
        await verifyPage.twoFactorVerifyButton.click();

        const adminAnalyticsPage = new AnalyticsOverviewPage(page);
        await expect(adminAnalyticsPage.header).toBeVisible();
    });
});
