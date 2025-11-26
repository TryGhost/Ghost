import {FrameLocator, Locator, Page} from '@playwright/test';

export class PostPreviewModal {
    private readonly page: Page;
    readonly modal: Locator;
    readonly header: Locator;
    readonly closeButton: Locator;
    readonly emailPreviewFrame: FrameLocator;
    readonly previewFrame: FrameLocator;

    readonly webTabButton: Locator;
    readonly emailTabButton: Locator;
    readonly emailPreviewBody: Locator;
    private readonly emailPreviewFrameBody: Locator;

    constructor(page: Page) {
        this.page = page;
        this.modal = page.getByRole('banner').filter({hasText: 'Preview'});
        this.header = this.modal.getByRole('heading', {name: 'Preview'});
        this.closeButton = this.modal.getByRole('button', {name: 'Close'});

        this.previewFrame = page.frameLocator('iframe[title*="preview"]');
        this.emailPreviewFrame = page.frameLocator('iframe[title="Email preview"]');

        this.webTabButton = this.modal.getByRole('button', {name: 'Web'});
        this.emailTabButton = this.modal.getByRole('button', {name: 'Email'});
        this.emailPreviewBody = this.emailPreviewFrame.getByTestId('email-preview-body');
        this.emailPreviewFrameBody = this.emailPreviewFrame.locator('body');
    }

    async focusPreviewFrame(): Promise<void> {
        await this.previewFrame.getByRole('heading', {level: 1}).click();
    }

    async clickPostLinkByTitle(title: string): Promise<void> {
        await this.previewFrame.getByRole('link', {name: new RegExp(title, 'i')}).click();
        await this.previewFrame.getByRole('heading', {level: 1, name: new RegExp(title, 'i')}).waitFor({state: 'visible', timeout: 10000});
        await this.waitForEscapeScriptToByReady();
    }

    async switchToEmailTab(): Promise<void> {
        await this.emailTabButton.click();
        await this.emailPreviewFrameBody.waitFor({state: 'visible'});
    }

    async content(): Promise<string | null> {
        await this.emailPreviewBody.waitFor({state: 'visible'});
        return await this.emailPreviewBody.textContent();
    }

    async close(): Promise<void> {
        await this.closeButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }

    async waitForPreviewModalFrame(): Promise<void> {
        await this.waitForPreviewContentToLoad();
        await this.waitForEscapeScriptToByReady();
    }

    private async waitForPreviewContentToLoad(): Promise<void> {
        await this.previewFrame.getByRole('heading', {level: 1}).waitFor({state: 'visible', timeout: 20000});
        await this.previewFrame.getByRole('article').first().waitFor({state: 'visible', timeout: 20000});
    }

    private async waitForEscapeScriptToByReady(): Promise<void> {
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
            {timeout: 5000}
        );
    }
}
