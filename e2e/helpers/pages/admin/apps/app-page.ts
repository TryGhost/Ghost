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
  readonly tryAgainButton: Locator;
  readonly reviewChangesButton: Locator;
  readonly installDialog: AppInstallDialog;

  constructor(page: Page) {
    super(page);
    this.frame = page.getByTestId(sel.appFrame);
    this.needsApproval = page.getByTestId(sel.appNeedsApproval);
    this.notInstalled = page.getByTestId(sel.appNotInstalled);
    this.unavailable = page.getByTestId(sel.appUnavailable);
    this.tryAgainButton = page.getByRole('button', { name: sel.tryAgainButton, exact: true });
    this.reviewChangesButton = page.getByRole('button', {
      name: sel.reviewChangesLink,
      exact: true,
    });
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

  /** The document in the app's frame. */
  async appFrame(): Promise<Frame> {
    const frame = await (await this.frame.elementHandle())?.contentFrame();
    if (!frame) {
      throw new Error('The app’s frame has no document');
    }
    return frame;
  }

  /** The path the app's page was served from, which the fixture app shows. */
  async appPagePath(): Promise<string | null> {
    const frame = await this.appFrame();
    return frame.getByTestId('fixture-app-path').textContent();
  }

  /** The revision of the installation the app's session started on. */
  async sessionRevision(frame?: Frame): Promise<number> {
    const target = frame ?? (await this.appFrame());
    return target.evaluate(async () => {
      const context = await (window as unknown as FixtureAppWindow).__fixtureApp.started;
      return context.session.revision;
    });
  }

  /** Has the app's page call the Admin API through the bridge. */
  async bridgeFetch(request: BridgeFetchRequest, frame?: Frame): Promise<BridgeFetchResult> {
    const target = frame ?? (await this.appFrame());
    return target.evaluate(
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
   * made elsewhere. Pages in a headless browser are always visible, so the event is dispatched.
   */
  async returnToTab(): Promise<void> {
    await this.page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  }
}
