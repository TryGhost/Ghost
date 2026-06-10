import {AnalyticsOverviewPage, LoginPage, PasswordResetPage, SettingsPage} from '@/admin-pages';
import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {Page} from '@playwright/test';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';
import {extractPasswordResetLink} from '@/helpers/services/email/utils';
import {faker} from '@faker-js/faker';

/**
 * Password reset tests, shared between the Ember implementation (labs flag
 * `authX` off) and the React implementation (`authX` on). Same page objects
 * and selectors for both runs.
 *
 * Session mechanics: completing a password reset rotates the admin session
 * server-side, which would invalidate the per-file cached authenticated
 * session for later tests — that's why the wrapper files opt into per-test
 * isolation via usePerTestIsolation(). Tests that need to end logged out
 * without mutating any state run in an isolated browser context.
 */
export function defineResetPasswordTests() {
    // Local dev setups commonly disable staff device verification in
    // ghost/core/config.local.json, which is mounted into the e2e container
    // in dev mode. Pin it on (env vars beat config files) so the staff
    // settings "Require email 2FA" toggle is rendered.
    test.use({config: {security__staffDeviceVerification: 'true'}});

    const emailClient: EmailClient = new MailPit();

    // Resolving the shared authenticated page applies labs flags (set via
    // test.use) server-wide before tests that only use isolated contexts.
    test.beforeEach(async ({page}) => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
    });

    async function logout(page: Page) {
        const loginPage = new LoginPage(page);
        await loginPage.logout();
    }

    test('resets account owner password', async ({page, ghostAccountOwner}) => {
        await logout(page);
        const {email} = ghostAccountOwner;
        const newPassword = 'test@lginSecure@123';

        const loginPage = new LoginPage(page);
        await loginPage.requestPasswordReset(ghostAccountOwner.email);
        await expect.soft(loginPage.flowNotification).toContainText('An email with password reset instructions has been sent.');

        const messages = await emailClient.search({subject: 'Reset Password', to: email});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const passwordResetUrl = extractPasswordResetLink(latestMessage);
        await loginPage.goto(passwordResetUrl);

        const passwordResetPage = new PasswordResetPage(page);
        await passwordResetPage.resetPassword(newPassword, newPassword);

        const analyticsPage = new AnalyticsOverviewPage(page);
        await expect(analyticsPage.header).toBeVisible();

        const cookies = await page.context().cookies();
        expect(cookies.find(({name}) => name === 'ghost-admin-api-session')).toBeDefined();
    });

    test('resets account owner password when 2FA enabled', async ({page, ghostAccountOwner}) => {
        const newPassword = 'test@lginSecure@123';

        const settingsPage = new SettingsPage(page);
        await settingsPage.staffSection.goto();
        await settingsPage.staffSection.enableRequireTwoFa();
        await logout(page);

        const loginPage = new LoginPage(page);
        await loginPage.requestPasswordReset(ghostAccountOwner.email);
        await expect.soft(loginPage.flowNotification).toContainText('An email with password reset instructions has been sent.');

        const messages = await emailClient.search({subject: 'Reset Password', to: ghostAccountOwner.email});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const passwordResetUrl = extractPasswordResetLink(latestMessage);
        await loginPage.goto(passwordResetUrl);

        const passwordResetPage = new PasswordResetPage(page);
        await passwordResetPage.resetPassword(newPassword, newPassword);

        const analyticsPage = new AnalyticsOverviewPage(page);
        await expect(analyticsPage.header).toBeVisible();
    });

    test('requesting a password reset without an email - shows validation error', async ({browser, baseURL}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            const loginPage = new LoginPage(page);
            await loginPage.goto();

            await loginPage.forgotButton.click();

            await expect(loginPage.flowNotification).toContainText('We need your email address to reset your password.');
        });
    });

    test('requesting a password reset for an unknown email - shows error message', async ({browser, baseURL}) => {
        await withIsolatedPage(browser, {baseURL}, async ({page}) => {
            const unknownEmail = `unknown-${faker.string.uuid()}@ghost.org`;
            const loginPage = new LoginPage(page);
            await loginPage.goto();

            await loginPage.requestPasswordReset(unknownEmail);

            await expect(loginPage.flowNotification).toContainText('User not found.');
        });
    });
}
