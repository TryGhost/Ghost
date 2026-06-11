// Vendored from /e2e/tests/admin/reset-password.test.ts (the 2FA variant is
// still pending: requires the staff 2FA toggle). Uses its own signed-out
// storage state because the flow revokes the shared session.
import {LoginPage, PasswordResetPage} from '../../helpers/pages';
import {AnalyticsOverviewPage} from '../../helpers/onboarding-pages';
import {MailPit, extractPasswordResetLink} from '../../helpers/mailpit';
import {expect, test} from '../../helpers/fixture';

test.use({storageState: {cookies: [], origins: []}});

test.describe('Ghost Admin - Reset Password', () => {
    test('resets account owner password', async ({page, baseURL, ghostAccountOwner}) => {
        const emailClient = new MailPit(baseURL!);
        const {email} = ghostAccountOwner;
        const newPassword = 'test@lginSecure@123';

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.requestPasswordReset(ghostAccountOwner.email);
        await expect.soft(loginPage.body).toContainText('An email with password reset instructions has been sent.');

        const messages = await emailClient.search({subject: 'Reset Password', to: email});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]!);
        const passwordResetUrl = extractPasswordResetLink(latestMessage);
        await loginPage.goto(passwordResetUrl);

        const passwordResetPage = new PasswordResetPage(page);
        await passwordResetPage.resetPassword(newPassword, newPassword);

        const analyticsPage = new AnalyticsOverviewPage(page);
        await expect(analyticsPage.header).toBeVisible();

        const cookies = await page.context().cookies();
        expect(cookies.find(({name}) => name === 'ghost-admin-api-session')).toBeDefined();
    });
});
