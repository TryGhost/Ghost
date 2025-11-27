import {DesktopPreviewFrame,EmailPreviewFrame} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

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
        this.modal = this.page.getByRole('banner').filter({hasText: 'Preview'});
        this.header = this.modal.getByRole('heading', {name: 'Preview'});
        this.closeButton = this.modal.getByRole('button', {name: 'Close'});

        this.desktopPreview = new DesktopPreviewFrame(page);
        this.emailPreview = new EmailPreviewFrame(page);

        this.webTabButton = this.modal.getByRole('button', {name: 'Web'});
        this.emailTabButton = this.modal.getByRole('button', {name: 'Email'});
    }

    async switchToEmailTab(): Promise<void> {
        await this.emailTabButton.click();
        await this.emailPreview.frameBody.waitFor({state: 'visible'});
    }

    async emailPreviewContent(): Promise<string | null> {
        return await this.emailPreview.content();
    }

    async close(): Promise<void> {
        await this.closeButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }
}
