import { BasePage } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';
import { toastRegion } from '@tryghost/test-data/selectors/alerts';

export class AdminPage extends BasePage {
  constructor(page: Page) {
    super(page, '/ghost');
  }

  toast(text: string | RegExp): Locator {
    return this.page
      .getByRole('region', { name: toastRegion })
      .getByRole('listitem')
      .filter({ hasText: text });
  }
}
