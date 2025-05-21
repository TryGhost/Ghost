import { type Page, type Locator, expect } from '@playwright/test';

export class TwoFactorAuthPage {
  readonly page: Page;
  readonly verificationCodeInput: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    this.page = page;
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
}
