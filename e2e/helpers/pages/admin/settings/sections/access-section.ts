import { BasePage } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';
import {
  access,
  siteAccessCode,
  siteVisibilitySelect,
} from '@tryghost/test-data/selectors/settings';

export class AccessSection extends BasePage {
  readonly section: Locator;
  readonly saveButton: Locator;
  readonly visibilitySelect: Locator;
  readonly passwordInput: Locator;

  constructor(page: Page) {
    super(page, '/ghost/#/settings');

    this.section = page.getByTestId(access);
    this.saveButton = this.section.getByRole('button', { name: 'Save' });
    this.visibilitySelect = this.section.getByTestId(siteVisibilitySelect);
    this.passwordInput = this.section.getByTestId(siteAccessCode);
  }

  async enablePrivateMode(password: string): Promise<void> {
    await this.selectVisibility('Private');
    await this.passwordInput.fill(password);
    await this.saveButton.click();
  }

  async disablePrivateMode(): Promise<void> {
    await this.selectVisibility('Public');
    await this.saveButton.click();
  }

  private async selectVisibility(label: 'Public' | 'Private'): Promise<void> {
    await this.visibilitySelect.click();
    const option = this.page.getByRole('option', { name: new RegExp(`^${label}\\b`) });
    await option.waitFor({ state: 'visible' });
    await option.click();
  }
}
