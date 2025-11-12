import {FrameLocator, Locator, Page} from '@playwright/test';

interface PostContentLocators {
    title: Locator;
    featuredImage: Locator;
    image: Locator;
    content: Locator;
}

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
    }

    async content(): Promise<string | null> {
        await this.emailPreviewBody.waitFor({state: 'visible'});
        return await this.emailPreviewBody.textContent();
    }

    async close(): Promise<void> {
        await this.closeButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }

    async previewModalFrame(): Promise<PostContentLocators> {
        await this.waitForPreviewContentToLoad();
        await this.waitForEscapeScriptToByReady();

        return this.getContentLocators();
    }

    private async waitForPreviewContentToLoad(): Promise<void> {
        await this.previewFrame.getByRole('heading', {level: 1}).waitFor({state: 'visible', timeout: 20000});
        await this.waitForImagesIfPresent();
    }

    private async waitForImagesIfPresent(): Promise<void> {
        const anyImage = this.previewFrame.locator('img').first();
        try {
            await anyImage.waitFor({state: 'visible', timeout: 5000});
        } catch {
            // Images may not exist or may be slow to load on CI
        }
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

    private getContentLocators(): PostContentLocators {
        return {
            title: this.previewFrame.locator('h1').first(),
            featuredImage: this.previewFrame.locator('.gh-content img, article img, .post-content img, main img').first(),
            image: this.previewFrame.locator('img').first(),
            content: this.previewFrame.locator('.gh-content, article, .post-content, main').first()
        };
    }

    async focusElement(selector: string): Promise<void> {
        const element = this.previewFrame.locator(selector);
        await element.click();
    }
}
