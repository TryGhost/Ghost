import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { TwoFactorAuthPage } from '../page-objects/TwoFactorAuthPage';
import { EmailServiceFactory } from '../services/EmailServiceFactory';
import type { EmailService } from '../services/EmailService';

test.describe('Admin Login', () => {
  const baseURL = process.env.BASE_URL || 'https://chris-raible.ghost.is'; // Fallback for direct execution or if BASE_URL isn't set for some reason
  const adminURL = `${baseURL}/ghost`;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  let emailService: EmailService;

  test.beforeAll(() => {
    // Initialize email service once for the describe block
    try {
      emailService = EmailServiceFactory.createService();
    } catch (error) {
      console.error("Failed to initialize EmailService:", error);
      // Optionally, rethrow or handle to prevent tests from running without a valid email service
      throw error;
    }
  });

  test('should allow login with environment variable credentials and 2FA', async ({ page }) => {
    if (!process.env.BASE_URL && !baseURL.includes('chris-raible.ghost.is')) {
      // Only warn if BASE_URL is not set AND we are not using the hardcoded default (which is for the live site)
      // This avoids spamming warnings when running against the live site without explicit BASE_URL for that purpose.
      console.warn('BASE_URL environment variable not set for local/non-default site testing.');
    }
    if (!username || !password) {
      throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set');
    }

    const loginPage = new LoginPage(page);
    const twoFactorAuthPage = new TwoFactorAuthPage(page);

    await loginPage.goto(adminURL);
    await expect(loginPage.emailInput).toBeVisible();
    await loginPage.login(username, password);

    await twoFactorAuthPage.expectVisible();

    const emailContext = EmailServiceFactory.getEmailContext();
    console.log(`Using email context: ${emailContext}`);

    const email = await emailService.waitForLatestEmail(emailContext);
    if (!email || !email.body) {
        throw new Error('Failed to retrieve email or email body is empty.');
    }
    console.log('Email received. Attempting to extract code...');

    const twoFactorCode = emailService.extractVerificationCode(email.body);
    if (!twoFactorCode) {
      throw new Error('Could not extract 2FA code from email.');
    }
    console.log(`Extracted 2FA code: ${twoFactorCode}`);

    await twoFactorAuthPage.submitCode(twoFactorCode);

    await expect(page).not.toHaveURL(/.*\/signin\/.*/, { timeout: 10000 });
    await expect(page).not.toHaveURL(/.*\/verify\/.*/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*#\/dashboard.*/, { timeout: 15000 });
  });
});
