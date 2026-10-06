import { FrameLocator, Locator, Page } from '@playwright/test';
import {
  postPreviewBrowserFrame,
  postPreviewEmailFrame,
} from '@tryghost/test-data/selectors/editor';

const BROWSER_FRAME = `iframe[data-testid="${postPreviewBrowserFrame}"]`;
const EMAIL_FRAME = `iframe[data-testid="${postPreviewEmailFrame}"]`;

class PreviewFrame {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** The modal listens for Escape once the preview document has loaded. */
  protected async waitForEscapeScriptToBeReady(): Promise<void> {
    await this.page.waitForFunction(
      (selector) => {
        const iframe = document.querySelector(selector) as HTMLIFrameElement | null;
        return iframe?.contentDocument?.readyState === 'complete';
      },
      BROWSER_FRAME,
      { timeout: 5000 },
    );
  }
}

export class EmailPreviewFrame extends PreviewFrame {
  readonly frame: FrameLocator;
  readonly previewBody: Locator;
  readonly frameBody: Locator;

  constructor(page: Page) {
    super(page);

    this.frame = this.page.frameLocator(EMAIL_FRAME);
    this.previewBody = this.frame.getByTestId('email-preview-body');
    this.frameBody = this.frame.locator('body');
  }

  async content(): Promise<string | null> {
    await this.previewBody.waitFor({ state: 'visible' });
    return await this.previewBody.textContent();
  }
}

export class DesktopPreviewFrame extends PreviewFrame {
  readonly desktopPreviewFrame: FrameLocator;
  /** The iframe element itself, for reading the URL the preview was pointed at. */
  readonly frameElement: Locator;

  constructor(page: Page) {
    super(page);

    this.desktopPreviewFrame = page.frameLocator(BROWSER_FRAME);
    this.frameElement = page.locator(BROWSER_FRAME);
  }

  async focus(): Promise<void> {
    await this.desktopPreviewFrame.getByRole('heading', { level: 1 }).click();
  }

  async clickPostLinkByTitle(title: string): Promise<void> {
    await this.waitForPreviewModalFrame();

    await this.desktopPreviewFrame.getByRole('link', { name: new RegExp(title, 'i') }).click();
    await this.desktopPreviewFrame
      .getByRole('heading', { level: 1, name: new RegExp(title, 'i') })
      .waitFor({ state: 'visible', timeout: 10000 });

    await this.waitForEscapeScriptToBeReady();
  }

  async waitForPreviewModalFrame(): Promise<void> {
    await this.waitForPreviewContentToLoad();
    await this.waitForEscapeScriptToBeReady();
  }

  private async waitForPreviewContentToLoad(): Promise<void> {
    await this.desktopPreviewFrame
      .getByRole('heading', { level: 1 })
      .waitFor({ state: 'visible', timeout: 20000 });
    await this.desktopPreviewFrame
      .getByRole('article')
      .first()
      .waitFor({ state: 'visible', timeout: 20000 });
  }
}
