import { AdminPage } from './admin-page';
import { Locator, Page } from '@playwright/test';

export class InviteSignupPage extends AdminPage {
  readonly nameField: Locator;
  readonly emailField: Locator;
  readonly passwordField: Locator;
  readonly createAccountButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageUrl = '/ghost/#/signup';

    this.nameField = page.getByPlaceholder('Jamie Larson');
    this.emailField = page.locator('[data-test-input="email"]');
    this.passwordField = page.getByPlaceholder('At least 10 characters');
    this.createAccountButton = page.getByRole('button', { name: 'Create Account' });
  }

  async acceptInvite(name: string, password: string): Promise<void> {
    await this.nameField.waitFor({ state: 'visible' });
    await this.nameField.fill(name);
    await this.passwordField.fill(password);
    await this.createAccountButton.click();
  }
}
