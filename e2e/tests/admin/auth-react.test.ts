import {
  AnalyticsOverviewPage,
  InviteSignupPage,
  LoginPage,
  LoginVerifyPage,
  PasswordResetPage,
  PostsPage,
  SettingsPage,
} from '@/admin-pages';
import { EmailClient, EmailMessage, MailPit } from '@/helpers/services/email/mail-pit';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';
import { extractInviteLink, extractPasswordResetLink } from '@/helpers/services/email/utils';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';

usePerTestIsolation();

// Journeys through the React auth screens. Each one ends on a screen the
// hidden Ember app or the React shell renders, which only works when the
// post-auth reload booted both with the new session.
test.describe('Ghost Admin - React auth screens', () => {
  test.use({ labs: { authReact: true } });

  const emailClient: EmailClient = new MailPit();

  const codeFrom = (message: EmailMessage) => {
    const code = message.Subject.match(/\d{6}/)?.[0];
    if (!code) {
      throw new Error(`No verification code found in subject: ${message.Subject}`);
    }
    return code;
  };

  test('a cold signed-out deep link to an Ember screen returns there after sign in', async ({
    page,
    ghostAccountOwner,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.logout();

    const postsPage = new PostsPage(page);
    await page.goto('/ghost/#/posts');
    await page.reload();

    await expect(loginPage.signInButton).toBeVisible();
    await loginPage.signIn(ghostAccountOwner.email, ghostAccountOwner.password);

    await postsPage.waitForPageToFullyLoad();
  });

  test('signs in with a resent 2FA code', async ({ page, browser, baseURL, ghostAccountOwner }) => {
    await page.waitForLoadState();

    await withIsolatedPage(browser, { baseURL }, async ({ page: freshPage }) => {
      const loginPage = new LoginPage(freshPage);
      await loginPage.goto();
      await loginPage.signIn(ghostAccountOwner.email, ghostAccountOwner.password);

      const verifyPage = new LoginVerifyPage(freshPage);
      await expect(verifyPage.twoFactorTokenField).toBeVisible();
      await verifyPage.resendTwoFactorCodeButton.click();
      await expect(verifyPage.sentTwoFactorCodeButton).toBeVisible();

      const messages = await emailClient.search(
        { subject: 'verification code', to: ghostAccountOwner.email },
        { numberOfMessages: 2 },
      );
      await verifyPage.twoFactorTokenField.fill(codeFrom(messages[0]));
      await verifyPage.twoFactorVerifyButton.click();

      await expect(new AnalyticsOverviewPage(freshPage).header).toBeVisible();
    });
  });

  test('resets a forgotten password and lands signed in', async ({ page, ghostAccountOwner }) => {
    const loginPage = new LoginPage(page);
    await loginPage.logout();

    await loginPage.requestPasswordReset(ghostAccountOwner.email);
    await expect(loginPage.body).toContainText(
      'An email with password reset instructions has been sent.',
    );

    const messages = await emailClient.search({
      subject: 'Reset Password',
      to: ghostAccountOwner.email,
    });
    const resetUrl = extractPasswordResetLink(await emailClient.getMessageDetailed(messages[0]));
    await loginPage.goto(resetUrl);

    const newPassword = 'test@lginSecure@123';
    await new PasswordResetPage(page).resetPassword(newPassword, newPassword);

    await expect(new AnalyticsOverviewPage(page).header).toBeVisible();
    await expect(page.getByText('Password updated')).toBeVisible();
  });

  test('a new staff member signs up from an invite link', async ({ page, browser, baseURL }) => {
    const testEmail = `test-invite-${Date.now()}@example.com`;

    const settingsPage = new SettingsPage(page);
    await settingsPage.staffSection.goto();
    await settingsPage.staffSection.inviteUser(testEmail);

    const messages = await emailClient.search({
      subject: 'has invited you to join',
      to: testEmail,
    });
    const inviteUrl = extractInviteLink(await emailClient.getMessageDetailed(messages[0]));

    await withIsolatedPage(browser, { baseURL }, async ({ page: signupPage }) => {
      const inviteSignup = new InviteSignupPage(signupPage);
      await signupPage.goto(inviteUrl);
      await expect(inviteSignup.emailField).toHaveValue(testEmail);
      await inviteSignup.acceptInvite('Test Invite User', 'test123456');

      await signupPage.getByRole('button', { name: 'Open user menu' }).click();
      await expect(signupPage.getByText(testEmail)).toBeVisible();
    });
  });
});
