import * as sel from '@tryghost/test-data/selectors/apps';
import { AdminPage } from '@/admin-pages';
import { AppInstallDialog } from './app-install-dialog';
import { Locator, Page } from '@playwright/test';

/** The Apps list, and the install link that opens a review over it. */
export class AppsPage extends AdminPage {
  readonly rows: Locator;
  readonly installDialog: AppInstallDialog;
  /** What staff who can't install apps see when they open an install link. */
  readonly notAllowedDialog: Locator;
  /** Admin's page for a route that doesn't exist, which Apps is while its Labs flag is off. */
  readonly notFound: Locator;

  constructor(page: Page) {
    super(page);
    this.pageUrl = '/ghost/#/apps';
    this.rows = page.getByTestId(sel.appsListRow);
    this.installDialog = new AppInstallDialog(page);
    this.notAllowedDialog = page.getByTestId(sel.appInstallNotAllowedDialog);
    this.notFound = page.getByRole('heading', { name: 'Page not found' });
  }

  async gotoInstallLink(manifestUrl: string): Promise<void> {
    await this.goto(`/ghost/#/apps/install?manifest=${encodeURIComponent(manifestUrl)}`);
  }
}
