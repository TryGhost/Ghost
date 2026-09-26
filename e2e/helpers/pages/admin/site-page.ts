import { AdminPage } from './admin-page';
import { Locator, Page } from '@playwright/test';
import { sitePreviewFrame } from '@tryghost/test-data/selectors/view-site';

export class SitePage extends AdminPage {
  readonly sitePreview: Locator;
  readonly emberSitePreview: Locator;

  constructor(page: Page) {
    super(page);
    this.pageUrl = '/ghost/#/site';
    this.sitePreview = page.getByTitle(sitePreviewFrame);
    // Only the Ember frame carries the legacy `site-frame` class.
    this.emberSitePreview = page.locator('iframe.site-frame');
  }

  async waitForPageToFullyLoad(): Promise<void> {
    await this.page.waitForURL(this.pageUrl);
    await this.sitePreview.waitFor({ state: 'visible' });
  }
}
