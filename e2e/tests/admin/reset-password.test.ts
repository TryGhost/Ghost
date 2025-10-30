import {AnalyticsOverviewPage, LoginPage, PasswordResetPage} from '../../helpers/pages/admin';
import {EmailClient, MailPit} from '../../helpers/services/email/MailPit';
import {expect, test} from '../../helpers/playwright';
import {extractPasswordResetLink} from '../../helpers/services/email/utils';

test.describe('Ghost Admin - Reset Password', () => {
    const emailClient:EmailClient = new MailPit();

    test.beforeEach(async ({page, ghostAccountOwner}) => {
        const loginPage = new LoginPage(page);
        await loginPage.logoutByCookieClear();
        await loginPage.goto();
        await loginPage.requestPasswordReset(ghostAccountOwner.email);
        await expect.soft(loginPage.body).toContainText('An email with password reset instructions has been sent.');
    });

    test('resets account owner password', async ({page, ghostAccountOwner}) => {
        const {email} = ghostAccountOwner;
        const newPassword = 'test@lginSecure@123';

        const loginPage = new LoginPage(page);
        await loginPage.requestPasswordReset(email);

        const messages = await emailClient.search({subject: 'Reset Password', to: email});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const passwordResetUrl = extractPasswordResetLink(latestMessage);
        await loginPage.goto(passwordResetUrl);

        const passwordResetPage = new PasswordResetPage(page);
        await passwordResetPage.resetPassword(newPassword, newPassword);

        const analyticsPage = new AnalyticsOverviewPage(page);
        await expect(analyticsPage.header).toBeVisible();
    });
});
