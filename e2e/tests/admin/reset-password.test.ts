import {AnalyticsOverviewPage, LoginPage, PasswordResetPage, SettingsPage} from '../../helpers/pages/admin';
import {EmailClient, MailPit} from '../../helpers/services/email/MailPit';
import {Page} from '@playwright/test';
import {expect, test} from '../../helpers/playwright';
import {extractPasswordResetLink} from '../../helpers/services/email/utils';

test.describe('Ghost Admin - Reset Password', () => {
    const emailClient:EmailClient = new MailPit();

    async function logout(page: Page) {
        const loginPage = new LoginPage(page);
        await loginPage.logoutByCookieClear();
        await loginPage.goto();
    }

    test('resets account owner password', async ({page, ghostAccountOwner}) => {
        await logout(page);
        const {email} = ghostAccountOwner;
        const newPassword = 'test@lginSecure@123';

        const loginPage = new LoginPage(page);
        await loginPage.requestPasswordReset(ghostAccountOwner.email);
        await expect.soft(loginPage.body).toContainText('An email with password reset instructions has been sent.');

        const messages = await emailClient.search({subject: 'Reset Password', to: email});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const passwordResetUrl = extractPasswordResetLink(latestMessage);
        await loginPage.goto(passwordResetUrl);

        const passwordResetPage = new PasswordResetPage(page);
        await passwordResetPage.resetPassword(newPassword, newPassword);

        const analyticsPage = new AnalyticsOverviewPage(page);
        await expect(analyticsPage.header).toBeVisible();
    });

    test('resets account owner password when 2FA enabled', async ({page, ghostAccountOwner}) => {
        const newPassword = 'test@lginSecure@123';

        const settingsPage = new SettingsPage(page);
        await settingsPage.staffSection.goto();
        await settingsPage.staffSection.enableRequireTwoFa();
        await logout(page);

        const loginPage = new LoginPage(page);
        await loginPage.requestPasswordReset(ghostAccountOwner.email);
        await expect.soft(loginPage.body).toContainText('An email with password reset instructions has been sent.');

        const messages = await emailClient.search({subject: 'Reset Password', to: ghostAccountOwner.email});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const passwordResetUrl = extractPasswordResetLink(latestMessage);
        await loginPage.goto(passwordResetUrl);

        const passwordResetPage = new PasswordResetPage(page);
        await passwordResetPage.resetPassword(newPassword, newPassword);

        const analyticsPage = new AnalyticsOverviewPage(page);
        await expect(analyticsPage.header).toBeVisible();
    });
});
