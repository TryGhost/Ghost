import {Page, Locator, FrameLocator} from '@playwright/test';

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
    readonly iframe: Locator;
    readonly webTabButton: Locator;
    readonly emailTabButton: Locator;
    readonly previewFrame: FrameLocator;

    constructor(page: Page) {
        this.page = page;
        this.modal = page.getByRole('banner').filter({hasText: 'Preview'});
        this.header = this.modal.getByRole('heading', {name: 'Preview'});
        this.closeButton = this.modal.getByRole('button', {name: 'Close'});
        this.iframe = page.locator('iframe[title*="preview"]');
        this.previewFrame = page.frameLocator('iframe[title*="preview"]');
        this.webTabButton = this.modal.getByRole('button', {name: 'Web'});
        this.emailTabButton = this.modal.getByRole('button', {name: 'Email'});
    }

    async waitForVisible(): Promise<void> {
        await this.modal.waitFor({state: 'visible'});
        await this.header.waitFor({state: 'visible'});
    }

    async waitForHidden(): Promise<void> {
        await this.modal.waitFor({state: 'hidden'});
    }

    async close(): Promise<void> {
        await this.closeButton.click();
        await this.waitForHidden();
    }

    async isVisible(): Promise<boolean> {
        return await this.modal.isVisible();
    }

    async clickInIframe(): Promise<void> {
        await this.iframe.click();
    }

    async isIframeFocused(): Promise<boolean> {
        await this.iframe.waitFor({state: 'visible'});

        return await this.page.evaluate(() => {
            const iframeElement = document.querySelector('iframe[title*="preview"]');
            return document.activeElement === iframeElement;
        });
    }

    async getPostContent(): Promise<PostContentLocators> {
        await this.waitForPreviewContentToLoad();
        await this.waitForEscapeHandlerScript();

        return this.getContentLocators();
    }

    async switchToWebView(): Promise<void> {
        await this.webTabButton.click();
    }

    async switchToEmailView(): Promise<void> {
        await this.emailTabButton.click();
    }

    private async waitForPreviewContentToLoad(): Promise<void> {
        await this.previewFrame.locator('body').waitFor({state: 'visible', timeout: 10000});

        const title = this.previewFrame.locator('h1').first();
        await title.waitFor({state: 'visible', timeout: 10000});

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

    private async waitForEscapeHandlerScript(): Promise<void> {
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