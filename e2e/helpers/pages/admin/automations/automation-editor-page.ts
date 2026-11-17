import { AdminPage } from '@/admin-pages';
import { Locator, Page } from '@playwright/test';

export class AutomationEditorPage extends AdminPage {
  readonly nameInput: Locator;
  readonly publishedButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.getByRole('textbox', { name: 'Automation name', exact: true });
    this.publishedButton = page.getByRole('button', { name: 'Published', exact: true });
  }

  async addEmail(subject: string, body: string) {
    await this.page.getByRole('button', { name: 'Add step', exact: true }).click();
    await this.page
      .getByTestId('step-picker')
      .getByRole('button', { name: /^Email/ })
      .click();
    await this.page.getByRole('button', { name: 'Edit email content' }).click();

    const editor = this.page.getByRole('dialog', { name: 'Edit email', exact: true });
    await editor.getByRole('textbox', { name: 'Subject line' }).fill(subject);
    await editor.getByTestId('email-editor').getByRole('textbox').fill(body);
    await editor.getByRole('button', { name: 'Minimize editor' }).click();
    await editor.waitFor({ state: 'hidden' });
  }

  async publish() {
    await this.page.getByRole('button', { name: 'Publish', exact: true }).click();
    await this.page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Publish', exact: true })
      .click();
  }
}
