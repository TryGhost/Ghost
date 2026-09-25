import { AdminPage } from './admin-page';
import { FrameLocator, Locator, Page } from '@playwright/test';

export const MIGRATION_APP_ORIGIN = 'https://migrate.ghost.org';

export class MigratePage extends AdminPage {
  readonly migrationAppFrame: Locator;
  readonly migrationApp: FrameLocator;

  constructor(page: Page) {
    super(page);
    this.pageUrl = '/ghost/#/migrate';
    this.migrationAppFrame = page.getByTitle('Migrate');
    this.migrationApp = this.migrationAppFrame.contentFrame();
  }

  /** Serves `html` in place of the external migration app. */
  async fakeMigrationApp(html: string): Promise<void> {
    await this.page.route(
      (url) => url.origin === MIGRATION_APP_ORIGIN,
      (route) => route.fulfill({ contentType: 'text/html', body: html }),
    );
  }
}
