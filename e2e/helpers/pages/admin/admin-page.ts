import { BasePage } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';
import { toastRegion } from '@tryghost/test-data/selectors/alerts';

export class AdminPage extends BasePage {
  constructor(page: Page) {
    super(page, '/ghost');
  }

  /**
   * The Admin route the page is on, with its query parameters. Admin uses hash
   * routing, so both are read from the URL's hash: `#/posts?type=draft` gives the
   * path `/posts` and the params `{type: 'draft'}`.
   */
  getHashRoute(): { path: string; params: Record<string, string> } {
    const hash = new URL(this.page.url()).hash.replace(/^#/, '');
    const queryStart = hash.indexOf('?');

    if (queryStart === -1) {
      return { path: hash, params: {} };
    }

    return {
      path: hash.slice(0, queryStart),
      params: Object.fromEntries(new URLSearchParams(hash.slice(queryStart + 1))),
    };
  }

  toast(text: string | RegExp): Locator {
    return this.page
      .getByRole('region', { name: toastRegion })
      .getByRole('listitem')
      .filter({ hasText: text });
  }
}
