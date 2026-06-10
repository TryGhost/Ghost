import {AnalyticsOverviewPage, LoginPage, LoginVerifyPage} from '@/admin-pages';
import {EmailClient, EmailMessage, MailPit} from '@/helpers/services/email/mail-pit';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

/**
 * Two-factor authentication tests, shared between the Ember implementation
 * (labs flag `authX` off) and the React implementation (`authX` on). Same
 * page objects and selectors for both runs.
 *
 * Session mechanics: signing in from a fresh browser context counts as a new
 * device, which triggers the email verification step (the very first login of
 * a user skips it, which is how the shared `page` fixture authenticates
 * without a code). Every test runs its signin in an isolated context so the
 * shared authenticated page and its cached session are never touched.
 *
 * Verification code emails accumulate in MailPit across tests in this file,
 * so tests count existing messages first and wait for new ones relative to
 * that baseline; the newest message is always the code for the current test.
 */
export function defineTwoFactorAuthTests() {
    // Local dev setups commonly disable staff device verification in
    // ghost/core/config.local.json, which is mounted into the e2e container
    // in dev mode. Pin it on (env vars beat config files) so signing in from
    // a new context reliably triggers the verification email.
    test.use({config: {security__staffDeviceVerification: 'true'}});

    const emailClient: EmailClient = new MailPit();

    function parseCodeFromMessageSubject(message: EmailMessage) {
        const subject = message.Subject;
        const match = subject.match(/\d+/);

        if (!match) {
            throw new Error(`No verification code found in subject: ${subject}`);
        }

        return match[0];
    }

    async function countVerificationCodeMessages(email: string) {
        const messages = await emailClient.search(
            {subject: 'verification code', to: email},
            {timeoutMs: null}
        );
        return messages.length;
    }

    async function waitForVerificationCodeMessages(email: string, numberOfMessages: number) {
        return await emailClient.search(
            {subject: 'verification code', to: email},
            {numberOfMessages}
        );
    }

    // Resolving the shared authenticated page applies labs flags (set via
    // test.use) server-wide before the isolated contexts are created.
    test.beforeEach(async ({page}) => {
        // Resolving the shared page fixture applies labs flags server-wide.
        // Park it on a neutral authenticated URL: visiting /signin while
        // signed in triggers a client-side redirect whose async navigation
        // can clobber the test's own first navigation (the React screens
        // redirect via an effect, unlike Ember's synchronous beforeModel).
        await page.goto('/ghost/');
    });

    test('authenticates with 2FA token', async ({browser, baseURL, ghostAccountOwner}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            const {email, password} = ghostAccountOwner;
            const existingMessageCount = await countVerificationCodeMessages(email);

            const adminLoginPage = new LoginPage(page);
            await adminLoginPage.goto();
            await adminLoginPage.signIn(email, password);

            const messages = await waitForVerificationCodeMessages(email, existingMessageCount + 1);
            const code = parseCodeFromMessageSubject(messages[0]);

            const verifyPage = new LoginVerifyPage(page);
            await verifyPage.twoFactorTokenField.fill(code);
            await verifyPage.twoFactorVerifyButton.click();

            const adminAnalyticsPage = new AnalyticsOverviewPage(page);
            await expect(adminAnalyticsPage.header).toBeVisible();
        });
    });

    test('authenticates with 2FA token that was resent', async ({browser, baseURL, ghostAccountOwner}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            const {email, password} = ghostAccountOwner;
            const existingMessageCount = await countVerificationCodeMessages(email);

            const adminLoginPage = new LoginPage(page);
            await adminLoginPage.goto();
            await adminLoginPage.signIn(email, password);

            await waitForVerificationCodeMessages(email, existingMessageCount + 1);

            const verifyPage = new LoginVerifyPage(page);
            await verifyPage.resendTwoFactorCodeButton.click();

            const messages = await waitForVerificationCodeMessages(email, existingMessageCount + 2);
            const code = parseCodeFromMessageSubject(messages[0]);

            await verifyPage.twoFactorTokenField.fill(code);
            await verifyPage.twoFactorVerifyButton.click();

            const adminAnalyticsPage = new AnalyticsOverviewPage(page);
            await expect(adminAnalyticsPage.header).toBeVisible();
        });
    });

    test('verifying with a wrong 2FA code - shows error message', async ({browser, baseURL, ghostAccountOwner}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            const {email, password} = ghostAccountOwner;
            const existingMessageCount = await countVerificationCodeMessages(email);

            const adminLoginPage = new LoginPage(page);
            await adminLoginPage.goto();
            await adminLoginPage.signIn(email, password);

            const messages = await waitForVerificationCodeMessages(email, existingMessageCount + 1);
            const code = parseCodeFromMessageSubject(messages[0]);
            // Any 6-digit code that differs from the real one is rejected
            const wrongCode = code === '000000' ? '111111' : '000000';

            const verifyPage = new LoginVerifyPage(page);
            await verifyPage.twoFactorTokenField.fill(wrongCode);
            await verifyPage.twoFactorVerifyButton.click();

            await expect(verifyPage.flowNotification).toContainText('Your verification code is incorrect.');
        });
    });
}
