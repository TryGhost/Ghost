import { test, expect } from '@playwright/test';
import { MailSlurp } from 'mailslurp-client';

test.describe('Admin Login', () => {
  const baseURL = process.env.BASE_URL || 'https://chris-raible.ghost.is';
  const adminURL = `${baseURL}/ghost`;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const mailslurpApiKey = process.env.MAILSLURP_API_KEY;
  const mailslurpInboxId = process.env.MAILSLURP_INBOX_ID;

  // Initialize MailSlurp client
  let mailslurp: MailSlurp;
  if (mailslurpApiKey) {
    mailslurp = new MailSlurp({ apiKey: mailslurpApiKey });
  }

  test('should allow login with environment variable credentials and 2FA', async ({ page }) => {
    // Basic check for environment variables
    if (!process.env.BASE_URL) {
      console.warn('BASE_URL environment variable not set, using default.');
    }
    if (!username || !password) {
      throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set');
    }
    if (!mailslurpApiKey || !mailslurpInboxId) {
      throw new Error('MAILSLURP_API_KEY and MAILSLURP_INBOX_ID environment variables must be set for 2FA tests');
    }

    await page.goto(adminURL);

    // Wait for the sign-in page to load
    await expect(page.locator('input[name="identification"]')).toBeVisible();

    // Fill in the username and password
    await page.locator('input[name="identification"]').fill(username);
    await page.locator('input[name="password"]').fill(password);

    // Click the sign-in button
    await page.locator('button[type="submit"]').click();

    // Expect to be on the 2FA verification page
    await expect(page).toHaveURL(/.*\/signin\/verify.*/, { timeout: 10000 });
    // Wait for the 2FA input field to be visible
    const verificationInput = page.getByRole('textbox', { name: 'Verification code' });
    await expect(verificationInput).toBeVisible({ timeout: 10000 });

    // Fetch the 2FA code from MailSlurp
    // Wait for the latest email in the inbox. Important: Ghost user email must be the MailSlurp inbox address.
    // The timeout might need adjustment based on email delivery speed.
    console.log(`Waiting for 2FA email in MailSlurp inbox ${mailslurpInboxId}...`);
    const email = await mailslurp.waitForLatestEmail(mailslurpInboxId, 30000, true); // 30s timeout, unreadOnly=true

    expect(email.body).toBeDefined();
    console.log('2FA Email received. Attempting to extract code...');

    // Extract 2FA code - assuming a 6-digit code
    // This regex might need to be adjusted based on the actual email content from Ghost
    const codeMatch = email.body!.match(/\d{6}/);
    if (!codeMatch || !codeMatch[0]) {
      console.error("Could not find 6-digit OTP in email body:", email.body);
      throw new Error('Could not extract 2FA code from email.');
    }
    const twoFactorCode = codeMatch[0];
    console.log(`Extracted 2FA code: ${twoFactorCode}`);

    // Fill in the 2FA code
    await verificationInput.fill(twoFactorCode);

    // Click the verify button
    await page.getByRole('button', { name: 'Verify →' }).click();


    // Add an assertion to verify successful login
    await expect(page).not.toHaveURL(/.*\/signin\/.*/, { timeout: 10000 });
    await expect(page).not.toHaveURL(/.*\/verify\/.*/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*#\/dashboard.*/, { timeout: 15000 }); // Check for hash dashboard
  });
});
