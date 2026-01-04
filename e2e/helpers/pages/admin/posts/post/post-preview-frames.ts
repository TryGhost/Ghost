import {FrameLocator, Locator, Page} from '@playwright/test';

class PreviewFrame {
    constructor(protected readonly page: Page) {
        this.page = page;
    }

    protected async waitForEscapeScriptToBeReady(): Promise<void> {
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

export class EmailPreviewFrame extends PreviewFrame{
    readonly frame: FrameLocator;
    readonly previewBody: Locator;
    readonly frameBody: Locator;

    constructor(page: Page) {
        super(page);
        this.frame = this.page.frameLocator('iframe[title="Email preview"]');

        this.previewBody = this.frame.getByTestId('email-preview-body');
        this.frameBody = this.frame.locator('body');
    }

    async content(): Promise<string | null> {
        await this.previewBody.waitFor({state: 'visible'});
        return await this.previewBody.textContent();
    }
}

export class DesktopPreviewFrame extends PreviewFrame{
    readonly desktopPreviewFrame: FrameLocator;

    constructor(page: Page) {
        super(page);
        this.desktopPreviewFrame = page.frameLocator('iframe[title="Desktop browser post preview"]');
    }

    async focus(): Promise<void> {
        await this.desktopPreviewFrame.getByRole('heading', {level: 1}).click();
    }

    async clickPostLinkByTitle(title: string): Promise<void> {
        await this.waitForPreviewModalFrame();

        await this.desktopPreviewFrame.getByRole('link', {name: new RegExp(title, 'i')}).click();
        await this.desktopPreviewFrame.getByRole('heading', {level: 1, name: new RegExp(title, 'i')}).waitFor({state: 'visible', timeout: 10000});

        await this.waitForEscapeScriptToBeReady();
    }

    async waitForPreviewModalFrame(): Promise<void> {
        await this.waitForPreviewContentToLoad();
        await this.waitForEscapeScriptToBeReady();
    }

    private async waitForPreviewContentToLoad(): Promise<void> {
        await this.desktopPreviewFrame.getByRole('heading', {level: 1}).waitFor({state: 'visible', timeout: 20000});
        await this.desktopPreviewFrame.getByRole('article').first().waitFor({state: 'visible', timeout: 20000});
    }
}
