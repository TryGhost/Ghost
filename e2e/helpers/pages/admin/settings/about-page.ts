import { BasePage } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';

/** Settings → About, with the host-managed Ghost updates panel. */
export class AboutPage extends BasePage {
  readonly helpLink: Locator;
  readonly updates: Locator;
  readonly oneClickUpdates: Locator;
  readonly manualUpdates: Locator;
  readonly confirmUpdate: Locator;
  readonly updateNowButton: Locator;
  readonly job: Locator;
  readonly availabilityNotice: Locator;
  readonly reloadAdminButton: Locator;

  constructor(page: Page) {
    super(page, '/ghost/#/settings/about');

    this.helpLink = page.getByRole('link', { name: 'Get help with Ghost' });
    this.updates = page.getByTestId('ghost-updates');
    this.oneClickUpdates = this.updates.getByTestId('one-click-update');
    this.manualUpdates = this.updates.getByTestId('manual-update');
    this.confirmUpdate = this.updates.getByTestId('confirm-update');
    this.updateNowButton = this.confirmUpdate.getByRole('button', { name: 'Update now' });
    this.job = this.updates.getByTestId('update-job');
    this.availabilityNotice = this.updates.getByTestId('update-availability');
    this.reloadAdminButton = this.job.getByRole('button', { name: 'Reload Admin' });
  }

  async goto() {
    const result = await super.goto();
    await this.helpLink.waitFor({ state: 'visible' });
    return result;
  }

  oneClickUpdate(label: string): Locator {
    return this.oneClickUpdates.filter({ hasText: label });
  }

  async requestUpdate(label: string) {
    await this.oneClickUpdate(label).getByRole('button', { name: 'Update' }).click();
    await this.updateNowButton.click();
  }
}
