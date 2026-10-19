import { AnalyticsOverviewPage, LoginPage, LoginVerifyPage } from '@/admin-pages';
import { EmailClient, EmailMessage, MailPit } from '@/helpers/services/email/mail-pit';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';

test.describe('Two-Factor authentication', () => {
  const emailClient: EmailClient = new MailPit();

  function parseCodeFromMessageSubject(message: EmailMessage) {
    const subject = message.Subject;
    const match = subject.match(/\d+/);

    if (!match) {
      throw new Error(`No verification code found in subject: ${subject}`);
    }

    return match[0];
  }

  // The per-file owner is shared, so earlier tests' emails are already in the inbox
  async function searchVerificationEmails(to: string, numberOfMessages?: number) {
    return emailClient.search(
      { subject: 'verification code', to },
      numberOfMessages === undefined ? { timeoutMs: null } : { numberOfMessages },
    );
  }

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('authenticates with 2FA token', async ({ browser, baseURL, ghostAccountOwner }) => {
    await withIsolatedPage(browser, { baseURL }, async ({ page: page }) => {
      const { email, password } = ghostAccountOwner;
      const previousCount = (await searchVerificationEmails(email)).length;
      const adminLoginPage = new LoginPage(page);
      await adminLoginPage.goto();
      await adminLoginPage.signIn(email, password);

      const messages = await searchVerificationEmails(email, previousCount + 1);
      const code = parseCodeFromMessageSubject(messages[0]);

      const verifyPage = new LoginVerifyPage(page);
      await verifyPage.twoFactorTokenField.fill(code);
      await verifyPage.twoFactorVerifyButton.click();

      const adminAnalyticsPage = new AnalyticsOverviewPage(page);
      await expect(adminAnalyticsPage.header).toBeVisible();
    });
  });

  test('authenticates with 2FA token that was resent', async ({
    browser,
    baseURL,
    ghostAccountOwner,
  }) => {
    await withIsolatedPage(browser, { baseURL }, async ({ page: page }) => {
      const { email, password } = ghostAccountOwner;
      const previousCount = (await searchVerificationEmails(email)).length;
      const adminLoginPage = new LoginPage(page);
      await adminLoginPage.goto();
      await adminLoginPage.signIn(email, password);

      await searchVerificationEmails(email, previousCount + 1);

      const verifyPage = new LoginVerifyPage(page);
      await verifyPage.resendTwoFactorCodeButton.click();

      // Resending rotates the challenge, so only the newest code is valid
      const messages = await searchVerificationEmails(email, previousCount + 2);

      const code = parseCodeFromMessageSubject(messages[0]);
      await verifyPage.twoFactorTokenField.fill(code);
      await verifyPage.twoFactorVerifyButton.click();

      const adminAnalyticsPage = new AnalyticsOverviewPage(page);
      await expect(adminAnalyticsPage.header).toBeVisible();
    });
  });
});
