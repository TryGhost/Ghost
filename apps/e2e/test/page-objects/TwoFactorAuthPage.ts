import { type Page, type Locator, expect } from '@playwright/test';
import type { EmailService } from '../services/EmailService';

export class TwoFactorAuthPage {
  readonly page: Page;
  private readonly emailService: EmailService;
  private readonly emailContext: string;
  readonly verificationCodeInput: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page, emailService: EmailService, emailContext: string) {
    this.page = page;
    this.emailService = emailService;
    this.emailContext = emailContext;
    this.verificationCodeInput = page.getByRole('textbox', { name: 'Verification code' });
    this.verifyButton = page.getByRole('button', { name: 'Verify →' });
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/.*\/signin\/verify.*/, { timeout: 10000 });
    await expect(this.verificationCodeInput).toBeVisible({ timeout: 10000 });
  }

  async submitCode(code: string) {
    await this.verificationCodeInput.fill(code);
    await this.verifyButton.click();
  }

  async complete2FA() {
    await this.expectVisible();

    console.log(`Completing 2FA using email context: ${this.emailContext}`);
    const email = await this.emailService.waitForLatestEmail(this.emailContext);

    if (!email || !email.body) {
        throw new Error('Failed to retrieve email or email body is empty for 2FA.');
    }
    console.log('2FA Email received. Attempting to extract code...');

    const twoFactorCode = this.emailService.extractVerificationCode(email.body);
    if (!twoFactorCode) {
      const bodySnippet = email.body.substring(0, Math.min(email.body.length, 500));
      console.error(`Email body snippet for failed 2FA code extraction: ${bodySnippet}...`);
      throw new Error('Could not extract 2FA code from email for 2FA step.');
    }
    console.log(`Extracted 2FA code: ${twoFactorCode}`);

    await this.submitCode(twoFactorCode);
  }
}
