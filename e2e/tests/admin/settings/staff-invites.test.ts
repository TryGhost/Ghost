import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {InviteSignupPage, SettingsPage} from '@/admin-pages';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';
import {extractInviteLink} from '@/helpers/services/email/utils';

test.describe('Ghost Admin - Staff Invites', () => {
    const emailClient: EmailClient = new MailPit();

    test('new staff member can sign up using an invite link', async ({page, browser, baseURL}) => {
        const testEmail = `test-invite-${Date.now()}@example.com`;

        const settingsPage = new SettingsPage(page);
        await settingsPage.staffSection.goto();
        await settingsPage.staffSection.inviteUser(testEmail);

        const messages = await emailClient.search({subject: 'has invited you to join', to: testEmail});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const inviteUrl = extractInviteLink(latestMessage);

        await withIsolatedPage(browser, {baseURL}, async ({page: signupPage}) => {
            const inviteSignup = new InviteSignupPage(signupPage);
            await signupPage.goto(inviteUrl);
            await inviteSignup.acceptInvite('Test Invite User', testEmail, 'test123456');

            await expect(signupPage).toHaveURL(/\/ghost\/#\//, {timeout: 30000});

            await signupPage.getByRole('button', {name: 'Open user menu'}).click();
            await expect(signupPage.getByText(testEmail)).toBeVisible();
        });
    });
});
