import {AnalyticsOverviewPage, LoginPage, LoginVerifyPage} from '@/admin-pages';
import {EmailClient, EmailMessage, MailPit} from '@/helpers/services/email/mail-pit';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

test.describe('Two-Factor authentication', () => {
    const emailClient: EmailClient = new MailPit();
    const verificationEmailSearchLimit = 100;
    const verificationEmailTimeoutMs = 15000;

    test.use({
        config: {
            security__staffDeviceVerification: 'true'
        }
    });

    function parseCodeFromMessageSubject(message: EmailMessage) {
        const subject = message.Subject;
        const match = subject.match(/\d+/);

        if (!match) {
            throw new Error(`No verification code found in subject: ${subject}`);
        }

        return match[0];
    }

    async function getVerificationMessageIds(email: string): Promise<Set<string>> {
        const messages = await emailClient.search({subject: 'verification code', to: email}, {limit: verificationEmailSearchLimit, timeoutMs: null});
        return new Set(messages.map(({ID}) => ID));
    }

    async function getNewVerificationMessage(email: string, ignoredMessageIds: Set<string>): Promise<EmailMessage> {
        const startTime = Date.now();
        let matchingMessageCount = 0;

        while (Date.now() - startTime < verificationEmailTimeoutMs) {
            const messages = await emailClient.search({subject: 'verification code', to: email}, {limit: verificationEmailSearchLimit, timeoutMs: null});
            matchingMessageCount = messages.length;

            const latestMessage = messages
                .filter(message => !ignoredMessageIds.has(message.ID))
                .sort((left, right) => Date.parse(right.Created) - Date.parse(left.Created))[0];

            if (latestMessage) {
                return latestMessage;
            }

            await new Promise<void>((resolve) => {
                setTimeout(resolve, 500);
            });
        }

        throw new Error(`No new verification email found for ${email}. Found ${matchingMessageCount} matching message(s).`);
    }

    test.beforeEach(async ({page}) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
    });

    test('authenticates with 2FA token', async ({browser, baseURL, ghostAccountOwner}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page: page}) => {
            const {email, password} = ghostAccountOwner;
            const adminLoginPage = new LoginPage(page);
            const ignoredMessageIds = await getVerificationMessageIds(email);
            await adminLoginPage.goto();
            await adminLoginPage.signIn(email, password);

            const message = await getNewVerificationMessage(email, ignoredMessageIds);
            const code = parseCodeFromMessageSubject(message);

            const verifyPage = new LoginVerifyPage(page);
            await verifyPage.twoFactorTokenField.fill(code);
            await verifyPage.twoFactorVerifyButton.click();

            const adminAnalyticsPage = new AnalyticsOverviewPage(page);
            await expect(adminAnalyticsPage.header).toBeVisible();
        });
    });

    test('authenticates with 2FA token that was resent', async ({browser, baseURL, ghostAccountOwner}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page: page}) => {
            const {email, password} = ghostAccountOwner;
            const adminLoginPage = new LoginPage(page);
            const ignoredMessageIds = await getVerificationMessageIds(email);
            await adminLoginPage.goto();
            await adminLoginPage.signIn(email, password);

            const verifyPage = new LoginVerifyPage(page);
            const firstMessage = await getNewVerificationMessage(email, ignoredMessageIds);
            ignoredMessageIds.add(firstMessage.ID);
            await verifyPage.resendTwoFactorCodeButton.click();

            const resentMessage = await getNewVerificationMessage(email, ignoredMessageIds);
            const code = parseCodeFromMessageSubject(resentMessage);
            await verifyPage.twoFactorTokenField.fill(code);
            await verifyPage.twoFactorVerifyButton.click();

            const adminAnalyticsPage = new AnalyticsOverviewPage(page);
            await expect(adminAnalyticsPage.header).toBeVisible();
        });
    });
});
