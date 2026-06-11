// Vendored from /e2e/tests/admin/two-factor-auth.test.ts. Runs in the
// `two-factor` project: a phantom server with staff device verification on;
// the email client reads phantom's in-memory mail sink.
import type {Browser, Locator, Page} from '@playwright/test';
import {MailPit, type EmailMessage} from '../../helpers/mailpit';
import {LoginPage} from '../../helpers/pages';
import {AnalyticsOverviewPage} from '../../helpers/onboarding-pages';
import {expect, test} from '../../helpers/fixture';

class LoginVerifyPage {
    readonly twoFactorTokenField: Locator;
    readonly twoFactorVerifyButton: Locator;
    readonly resendTwoFactorCodeButton: Locator;

    constructor(page: Page) {
        this.twoFactorTokenField = page.getByRole('textbox', {name: 'Verification code'});
        this.twoFactorVerifyButton = page.getByRole('button', {name: 'Verify'});
        this.resendTwoFactorCodeButton = page.getByRole('button', {name: 'Resend'});
    }
}

async function withIsolatedPage(
    browser: Browser,
    options: {baseURL?: string},
    callback: (args: {page: Page}) => Promise<void>
): Promise<void> {
    const context = await browser.newContext({baseURL: options.baseURL ?? undefined, storageState: {cookies: [], origins: []}});
    try {
        await callback({page: await context.newPage()});
    } finally {
        await context.close();
    }
}

test.describe('Two-Factor authentication', () => {
    let emailClient: MailPit;

    test.beforeEach(async ({baseURL}) => {
        emailClient = new MailPit(baseURL!);
    });

    function parseCodeFromMessageSubject(message: EmailMessage) {
        const subject = message.Subject;
        const match = subject.match(/\d+/);

        if (!match) {
            throw new Error(`No verification code found in subject: ${subject}`);
        }

        return match[0];
    }

    test('authenticates with 2FA token', async ({browser, baseURL, ghostAccountOwner}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            const {email, password} = ghostAccountOwner;
            const adminLoginPage = new LoginPage(page);
            await adminLoginPage.goto();
            await adminLoginPage.signIn(email, password);

            const messages = await emailClient.search({
                subject: 'verification code',
                to: ghostAccountOwner.email
            });
            const code = parseCodeFromMessageSubject(messages[0]!);

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

            const code = parseCodeFromMessageSubject(messages[0]!);
            await verifyPage.twoFactorTokenField.fill(code);
            await verifyPage.twoFactorVerifyButton.click();

            const adminAnalyticsPage = new AnalyticsOverviewPage(page);
            await expect(adminAnalyticsPage.header).toBeVisible();
        });
    });
});
