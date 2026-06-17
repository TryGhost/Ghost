import {AnalyticsOverviewPage, LoginPage, PasswordResetPage, SettingsPage} from '@/admin-pages';
import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {Page} from '@playwright/test';
import {expect, test} from '@/helpers/playwright';
import {extractPasswordResetLink} from '@/helpers/services/email/utils';

test.describe('Ghost Admin - Reset Password', () => {
    const emailClient: EmailClient = new MailPit();

    test.use({
        isolation: 'per-test',
        config: {
            security__staffDeviceVerification: 'true'
        }
    });

    async function logout(page: Page) {
        const loginPage = new LoginPage(page);
        await loginPage.logout();
    }

    async function getPasswordResetMessageIds(email: string): Promise<Set<string>> {
        const messages = await emailClient.search({subject: 'Reset Password', to: email}, {timeoutMs: null});
        return new Set(messages.map(({ID}) => ID));
    }

    async function getNewPasswordResetUrl(email: string, ignoredMessageIds: Set<string>): Promise<string> {
        const timeoutMs = 10000;
        const startTime = Date.now();
        let matchingMessageCount = 0;

        while (Date.now() - startTime < timeoutMs) {
            const messages = await emailClient.search({subject: 'Reset Password', to: email}, {timeoutMs: null});
            matchingMessageCount = messages.length;

            const latestMessage = messages
                .filter(message => !ignoredMessageIds.has(message.ID))
                .sort((left, right) => Date.parse(right.Created) - Date.parse(left.Created))[0];

            if (latestMessage) {
                const detailedMessage = await emailClient.getMessageDetailed(latestMessage);
                return extractPasswordResetLink(detailedMessage);
            }

            await new Promise<void>((resolve) => {
                setTimeout(resolve, 500);
            });
        }

        throw new Error(`No new password reset email found for ${email}. Found ${matchingMessageCount} matching message(s).`);
    }

    test('resets account owner password', async ({page, ghostAccountOwner}) => {
        await logout(page);
        const {email} = ghostAccountOwner;
        const newPassword = 'test@lginSecure@123';

        const loginPage = new LoginPage(page);
        const ignoredMessageIds = await getPasswordResetMessageIds(email);
        await loginPage.requestPasswordReset(ghostAccountOwner.email);
        await expect.soft(loginPage.body).toContainText('An email with password reset instructions has been sent.');

        const passwordResetUrl = await getNewPasswordResetUrl(email, ignoredMessageIds);
        await loginPage.goto(passwordResetUrl);

        const passwordResetPage = new PasswordResetPage(page);
        await passwordResetPage.resetPassword(newPassword, newPassword);

        const analyticsPage = new AnalyticsOverviewPage(page);
        await expect(analyticsPage.header).toBeVisible();

        const cookies = await page.context().cookies();
        expect(cookies.find(({name}) => name === 'ghost-admin-api-session')).toBeDefined();
    });

    test('resets account owner password when 2FA enabled', async ({page, ghostAccountOwner}) => {
        const {email} = ghostAccountOwner;
        const newPassword = 'test@lginSecure@123';

        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();
        await settingsPage.staffSection.goto();
        await settingsPage.staffSection.enableRequireTwoFa();
        await logout(page);

        const loginPage = new LoginPage(page);
        const ignoredMessageIds = await getPasswordResetMessageIds(email);
        await loginPage.requestPasswordReset(email);
        await expect.soft(loginPage.body).toContainText('An email with password reset instructions has been sent.');

        const passwordResetUrl = await getNewPasswordResetUrl(email, ignoredMessageIds);
        await loginPage.goto(passwordResetUrl);

        const passwordResetPage = new PasswordResetPage(page);
        await passwordResetPage.resetPassword(newPassword, newPassword);

        const analyticsPage = new AnalyticsOverviewPage(page);
        await expect(analyticsPage.header).toBeVisible();
    });
});
