import { FrameLocator, Locator, Page } from '@playwright/test';
import {
  postPreviewBrowserFrame,
  postPreviewEmailFrame,
} from '@tryghost/test-data/selectors/editor';

/** Which implementation renders the preview — decided by the `editorReact` flag. */
export type PostPreviewImplementation = 'ember' | 'react';

class PreviewFrame {
  protected readonly page: Page;
  private readonly implementation: PostPreviewImplementation;

  constructor(page: Page, implementation: PostPreviewImplementation) {
    this.page = page;
    this.implementation = implementation;
  }

  protected async waitForEscapeScriptToBeReady(): Promise<void> {
    // Only Ember injects the Escape handler into the preview document.
    if (this.implementation === 'react') {
      return;
    }

    await this.page.waitForFunction(
      () => {
        const iframe = document.querySelector('iframe[title*="preview"]') as HTMLIFrameElement;
        if (!iframe?.contentWindow) {
          return false;
        }

        try {
          const iframeWindow = iframe.contentWindow as Window & {
            ghostPreviewEscapeHandlerReady?: boolean;
          };
          return iframeWindow.ghostPreviewEscapeHandlerReady === true;
        } catch {
          return false;
        }
      },
      undefined,
      { timeout: 5000 },
    );
  }
}

export class EmailPreviewFrame extends PreviewFrame {
  readonly frame: FrameLocator;
  readonly previewBody: Locator;
  readonly frameBody: Locator;

  constructor(
    page: Page,
    { implementation = 'ember' }: { implementation?: PostPreviewImplementation } = {},
  ) {
    super(page, implementation);
    // Both implementations title the iframe "Email preview"; React also marks it.
    const selector =
      implementation === 'react'
        ? `iframe[data-testid="${postPreviewEmailFrame}"]`
        : 'iframe[title="Email preview"]';

    this.frame = this.page.frameLocator(selector);
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

  constructor(
    page: Page,
    { implementation = 'ember' }: { implementation?: PostPreviewImplementation } = {},
  ) {
    super(page, implementation);
    // React renders one preview iframe and changes the chrome around it; Ember
    // titles a separate iframe per device.
    const selector =
      implementation === 'react'
        ? `iframe[data-testid="${postPreviewBrowserFrame}"]`
        : 'iframe[title="Desktop browser post preview"]';

    this.desktopPreviewFrame = page.frameLocator(selector);
    this.frameElement = page.locator(selector);
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
