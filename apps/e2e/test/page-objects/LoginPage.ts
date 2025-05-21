import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole('textbox', { name: 'Email address' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.signInButton = page.getByRole('button', { name: 'Sign in →' });
  }

  async goto(adminURL: string) {
    await this.page.goto(adminURL);
  }

  async login(username: string, password?: string) {
    await this.emailInput.fill(username);
    if (password) {
      await this.passwordInput.fill(password);
    }
    await this.signInButton.click();
  }
}