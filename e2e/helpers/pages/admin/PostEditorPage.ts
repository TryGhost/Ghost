import {Page, Locator, FrameLocator} from '@playwright/test';
import {AdminPage} from './AdminPage';

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

    async getPostContent() {
        await this.previewFrame.locator('body').waitFor({state: 'visible', timeout: 10000});

        const title = this.previewFrame.locator('h1').first();
        await title.waitFor({state: 'visible', timeout: 10000});

        const anyImage = this.previewFrame.locator('img').first();
        try { // images can be quite slow to load on CI
            await anyImage.waitFor({state: 'visible', timeout: 5000});
        } catch {
        }

        await this.page.waitForFunction(
            () => {
                const iframe = document.querySelector('iframe[title*="preview"]') as HTMLIFrameElement;
                if (iframe && iframe.contentWindow) {
                    try { // we have an injected script to handle the Esc key that must load
                        const iframeWindow = iframe.contentWindow as Window & {
                            ghostPreviewEscapeHandlerReady?: boolean;
                        };
                        return iframeWindow.ghostPreviewEscapeHandlerReady === true;
                    } catch {
                        return false;
                    }
                }
                return false;
            },
            {timeout: 5000}
        );

        return {
            title: () => this.previewFrame.locator('h1').first(),
            featuredImage: () => this.previewFrame.locator('.gh-content img, article img, .post-content img, main img').first(),
            image: () => this.previewFrame.locator('img').first(),
            content: () => this.previewFrame.locator('.gh-content, article, .post-content, main').first()
        };
    }

    async focusElement(selector: string): Promise<void> {
        const element = this.previewFrame.locator(selector);
        await element.click();
    }
}

export class PostEditorPage extends AdminPage {
    readonly titleInput: Locator;
    readonly contentInput: Locator;
    readonly previewButton: Locator;
    readonly publishButton: Locator;
    readonly settingsButton: Locator;
    readonly addFeatureImageButton: Locator;
    readonly wordCount: Locator;
    readonly statusText: Locator;
    readonly previewModal: PostPreviewModal;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/editor/post/';

        this.titleInput = page.getByRole('textbox', {name: 'Post title'});
        this.contentInput = page.getByRole('textbox').nth(1);
        this.previewButton = page.getByRole('button', {name: 'Preview'});
        this.publishButton = page.getByRole('button', {name: /Publish/});
        this.settingsButton = page.getByRole('button', {name: 'Settings'});
        this.addFeatureImageButton = page.getByRole('button', {name: 'Add feature image'});
        this.wordCount = page.locator('[class*="word-count"], [data-test*="word-count"]').first();
        this.statusText = page.locator('[class*="status"], [data-test*="status"]').first();

        this.previewModal = new PostPreviewModal(page);
    }

    async goto(): Promise<void> {
        await this.page.goto(this.pageUrl);
        await this.titleInput.waitFor({state: 'visible'});
    }

    async gotoPost(postId: string): Promise<void> {
        await this.page.goto(`/ghost/#/editor/post/${postId}`);
        await this.titleInput.waitFor({state: 'visible'});
    }

    async createNewPost(title: string, content?: string): Promise<void> {
        await this.goto();
        await this.fillTitle(title);

        if (content) {
            await this.fillContent(content);
        }

        await this.waitForSave();
    }

    async fillTitle(title: string): Promise<void> {
        await this.titleInput.fill(title);
        await this.titleInput.press('Tab');
    }

    async fillContent(content: string): Promise<void> {
        await this.contentInput.fill(content);
    }

    async openPreview(): Promise<void> {
        await this.previewButton.click();
        await this.previewModal.waitForVisible();
    }

    async waitForSave(): Promise<void> {
        await this.page.waitForFunction(() => {
            const statusElement = document.querySelector('[class*="status"], [data-test*="status"]');
            return statusElement && statusElement.textContent?.includes('Saved');
        }, {timeout: 10000});
    }

    async waitForPreviewButtonVisible(): Promise<void> {
        await this.previewButton.waitFor({state: 'visible'});
    }

    async isPreviewButtonVisible(): Promise<boolean> {
        return await this.previewButton.isVisible();
    }

    async getWordCount(): Promise<number> {
        const text = await this.wordCount.textContent();
        const match = text?.match(/(\d+)\s+words?/);
        return match ? parseInt(match[1]) : 0;
    }

    async getStatus(): Promise<string> {
        return await this.statusText.textContent() || '';
    }
}