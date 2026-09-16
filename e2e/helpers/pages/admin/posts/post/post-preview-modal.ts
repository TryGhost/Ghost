import { DesktopPreviewFrame, EmailPreviewFrame } from '@/helpers/pages';
import { Locator, Page } from '@playwright/test';
import {
  emailPreviewTab,
  postPreviewModal,
  webPreviewTab,
} from '@tryghost/test-data/selectors/editor';
import type { PostPreviewImplementation } from '@/helpers/pages';

export class PostPreviewModal {
  private readonly page: Page;
  readonly modal: Locator;
  readonly header: Locator;
  readonly closeButton: Locator;

  readonly webTabButton: Locator;
  readonly emailTabButton: Locator;

  public readonly desktopPreview: DesktopPreviewFrame;
  public readonly emailPreview: EmailPreviewFrame;

  constructor(
    page: Page,
    { implementation = 'ember' }: { implementation?: PostPreviewImplementation } = {},
  ) {
    this.page = page;

    const react = implementation === 'react';

    this.modal = react
      ? page.getByTestId(postPreviewModal)
      : this.page.getByRole('banner').filter({ hasText: 'Preview' });
    this.header = this.modal.getByRole('heading', { name: 'Preview' });
    this.closeButton = this.modal.getByRole('button', { name: 'Close' });

    this.desktopPreview = new DesktopPreviewFrame(page, { implementation });
    this.emailPreview = new EmailPreviewFrame(page, { implementation });

    // React switches format with tabs; Ember with a pair of buttons.
    this.webTabButton = react
      ? this.modal.getByRole('tab', { name: webPreviewTab })
      : this.modal.getByRole('button', { name: 'Web' });
    this.emailTabButton = react
      ? this.modal.getByRole('tab', { name: emailPreviewTab })
      : this.modal.getByRole('button', { name: 'Email' });
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
