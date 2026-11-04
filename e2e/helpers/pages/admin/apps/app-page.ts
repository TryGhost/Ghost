import * as sel from '@tryghost/test-data/selectors/apps';
import { AdminPage } from '@/admin-pages';
import { AppInstallDialog } from './app-install-dialog';
import { FixtureAppView } from './fixture-app-view';
import { Locator, Page } from '@playwright/test';

/** An installed app's page in Admin, which frames the app's own page. */
export class AppPage extends AdminPage {
  /** The app's frame. It stays hidden until the app has started. */
  readonly frame: Locator;
  readonly needsApproval: Locator;
  readonly notInstalled: Locator;
  readonly unavailable: Locator;
  /** The fixture app's page in the frame. */
  readonly app: FixtureAppView;
  readonly installDialog: AppInstallDialog;

  constructor(page: Page) {
    super(page);
    this.frame = page.getByTestId(sel.appFrame);
    this.needsApproval = page.getByTestId(sel.appNeedsApproval);
    this.notInstalled = page.getByTestId(sel.appNotInstalled);
    this.unavailable = page.getByTestId(sel.appUnavailable);
    this.app = new FixtureAppView(this.frame.contentFrame());
    this.installDialog = new AppInstallDialog(page);
  }

  async gotoApp(installationId: string): Promise<void> {
    await this.goto(`/ghost/#/apps/${installationId}`);
  }

  /** The installation the page shows, from Admin's URL. */
  installationId(): string {
    const match = /#\/apps\/([0-9a-f]{24})/.exec(this.page.url());
    if (!match) {
      throw new Error(`Not on an app's page: ${this.page.url()}`);
    }
    return match[1];
  }

  /**
   * Coming back to Admin's tab, which is when Admin reads the installation again and sees changes
   * made elsewhere. Pages in a headless browser are always visible, so the event is dispatched,
   * on the document as the browser does.
   */
  async returnToTab(): Promise<void> {
    await this.page.evaluate(() =>
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true })),
    );
  }
}
