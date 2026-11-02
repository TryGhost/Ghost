import * as sel from '@tryghost/test-data/selectors/apps';
import { AdminPage } from '@/admin-pages';
import { AppInstallDialog } from './app-install-dialog';
import { Frame, Locator, Page } from '@playwright/test';
import type {
  BridgeFetchRequest,
  BridgeFetchResult,
  FixtureAppHooks,
} from '@/helpers/services/apps';

type FixtureAppWindow = Window & { __fixtureApp: FixtureAppHooks };

/** An installed app's page in Admin, which frames the app's own page. */
export class AppPage extends AdminPage {
  /** The app's frame. It stays hidden until the app has started. */
  readonly frame: Locator;
  readonly needsApproval: Locator;
  readonly notInstalled: Locator;
  readonly unavailable: Locator;
  /** The path the app's page was served from, which the fixture app shows. */
  readonly appPagePath: Locator;
  readonly installDialog: AppInstallDialog;

  constructor(page: Page) {
    super(page);
    this.frame = page.getByTestId(sel.appFrame);
    this.needsApproval = page.getByTestId(sel.appNeedsApproval);
    this.notInstalled = page.getByTestId(sel.appNotInstalled);
    this.unavailable = page.getByTestId(sel.appUnavailable);
    this.appPagePath = this.frame.contentFrame().getByTestId('fixture-app-path');
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

  /** The document in the app's frame, to call into it or to check it's gone once its session ends. */
  async appFrame(): Promise<Frame> {
    const frame = await (await this.frame.elementHandle())?.contentFrame();
    if (!frame) {
      throw new Error('The app’s frame has no document');
    }
    return frame;
  }

  /** The revision of the installation the app's session started on. */
  async sessionRevision(): Promise<number> {
    const frame = await this.appFrame();
    return frame.evaluate(async () => {
      const context = await (window as unknown as FixtureAppWindow).__fixtureApp.started;
      return context.session.revision;
    });
  }

  /** Has the app's page call the Admin API through the bridge. */
  async bridgeFetch(request: BridgeFetchRequest): Promise<BridgeFetchResult> {
    const frame = await this.appFrame();
    return frame.evaluate(
      (sent) => (window as unknown as FixtureAppWindow).__fixtureApp.fetch(sent),
      request,
    );
  }

  /**
   * Has the app's page start a bridge call without waiting for it, for a call that's still running
   * when its session ends.
   */
  async startBridgeFetch(request: BridgeFetchRequest, frame: Frame): Promise<void> {
    await frame.evaluate((sent) => {
      void (window as unknown as FixtureAppWindow).__fixtureApp.fetch(sent);
    }, request);
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
