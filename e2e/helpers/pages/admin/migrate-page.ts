import { AdminPage } from './admin-page';
import { FrameLocator, Locator, Page } from '@playwright/test';
import { closeMigrateButton, migrateFrame } from '@tryghost/test-data/selectors/migrate';

export class MigratePage extends AdminPage {
  readonly migrationAppFrame: Locator;
  readonly migrationApp: FrameLocator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.pageUrl = '/ghost/#/migrate';
    this.migrationAppFrame = page.getByTitle(migrateFrame, { exact: true });
    this.migrationApp = this.migrationAppFrame.contentFrame();
    this.closeButton = page.getByRole('button', { name: closeMigrateButton, exact: true });
  }
}
