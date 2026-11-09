import { FIXTURE_APP_PATH_TEST_ID } from '@/helpers/services/apps';
import { FrameLocator, Locator } from '@playwright/test';

/** The fixture app's page in Admin's frame, as the publisher sees and uses it. */
export class FixtureAppView {
  /** The path the page was served from. */
  readonly servedFrom: Locator;
  readonly adminApiPath: Locator;
  readonly callButton: Locator;
  /** What the Admin API answered the app: the status and body, or the SDK's error. */
  readonly result: Locator;

  constructor(frame: FrameLocator) {
    this.servedFrom = frame.getByTestId(FIXTURE_APP_PATH_TEST_ID);
    this.adminApiPath = frame.getByRole('textbox', { name: 'Admin API path' });
    this.callButton = frame.getByRole('button', { name: 'Call the Admin API' });
    this.result = frame.getByRole('status');
  }

  /** Has the app call the Admin API through Admin, with the path it's given. */
  async callAdminApi(path: string): Promise<void> {
    await this.adminApiPath.fill(path);
    await this.callButton.click();
  }
}
