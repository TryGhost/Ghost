import { AdminPage } from './admin-page';
import { Locator, Page } from '@playwright/test';

export class SitePage extends AdminPage {
  readonly sitePreview: Locator;

  constructor(page: Page) {
    super(page);
    this.pageUrl = '/ghost/#/site';
    this.sitePreview = page.getByTitle('Site preview');
  }

  async waitForPageToFullyLoad(): Promise<void> {
    await this.page.waitForURL(this.pageUrl);
    await this.sitePreview.waitFor({ state: 'visible' });
  }
}
