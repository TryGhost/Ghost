import { DesktopPreviewFrame, EmailPreviewFrame } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';
import {
  emailPreviewTab,
  postPreviewModal,
  webPreviewTab,
} from '@tryghost/test-data/selectors/editor';

export class PostPreviewModal {
  private readonly page: Page;
  readonly modal: Locator;
  readonly header: Locator;
  readonly closeButton: Locator;

  readonly webTabButton: Locator;
  readonly emailTabButton: Locator;

  public readonly desktopPreview: DesktopPreviewFrame;
  public readonly emailPreview: EmailPreviewFrame;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.getByTestId(postPreviewModal);
    this.header = this.modal.getByRole('heading', { name: 'Preview' });
    this.closeButton = this.modal.getByRole('button', { name: 'Close' });

    this.desktopPreview = new DesktopPreviewFrame(page);
    this.emailPreview = new EmailPreviewFrame(page);

    this.webTabButton = this.modal.getByRole('tab', { name: webPreviewTab });
    this.emailTabButton = this.modal.getByRole('tab', { name: emailPreviewTab });
  }

  async switchToEmailTab(): Promise<void> {
    await this.emailTabButton.click();
    await this.emailPreview.frameBody.waitFor({ state: 'visible' });
  }

  async emailPreviewContent(): Promise<string | null> {
    return await this.emailPreview.content();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }
}
