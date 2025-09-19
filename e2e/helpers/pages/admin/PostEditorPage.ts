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
        // Check if iframe has focus by checking if it has the 'active' attribute or class
        await this.iframe.waitFor({state: 'visible'});

        // We can check if the iframe is focused by evaluating focus state
        return await this.page.evaluate(() => {
            const iframeElement = document.querySelector('iframe[title*="preview"]');
            return document.activeElement === iframeElement;
        });
    }

    // Get post content elements - automatically waits for content to be ready
    async getPostContent() {
        // Wait for the basic frame structure and content to load
        await this.previewFrame.locator('body').waitFor({state: 'visible', timeout: 10000});

        // Wait for the title to appear (indicates content is loaded)
        const title = this.previewFrame.locator('h1').first();
        await title.waitFor({state: 'visible', timeout: 10000});

        // Wait for any images to load (they're often the slowest)
        const anyImage = this.previewFrame.locator('img').first();
        try {
            await anyImage.waitFor({state: 'visible', timeout: 5000});
        } catch {
            // It's okay if there are no images
        }

        // Wait for script injection to complete (we have a 500ms setTimeout in browser.js)
        await this.page.waitForTimeout(600);

        // Return the content locators
        return {
            title: () => this.previewFrame.locator('h1').first(),
            // Use a more generic selector for featured image - typically the first image in the post
            featuredImage: () => this.previewFrame.locator('.gh-content img, article img, .post-content img, main img').first(),
            // Fallback to any first image if no specific content wrapper
            image: () => this.previewFrame.locator('img').first(),
            content: () => this.previewFrame.locator('.gh-content, article, .post-content, main').first()
        };
    }

    // Focus an element within the iframe
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

        // Initialize locators
        this.titleInput = page.getByRole('textbox', {name: 'Post title'});
        this.contentInput = page.getByRole('textbox').nth(1); // Second textbox is content
        this.previewButton = page.getByRole('button', {name: 'Preview'});
        this.publishButton = page.getByRole('button', {name: /Publish/});
        this.settingsButton = page.getByRole('button', {name: 'Settings'});
        this.addFeatureImageButton = page.getByRole('button', {name: 'Add feature image'});
        this.wordCount = page.locator('[class*="word-count"], [data-test*="word-count"]').first();
        this.statusText = page.locator('[class*="status"], [data-test*="status"]').first();

        // Initialize preview modal
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

        // Wait for post to be saved automatically
        await this.waitForSave();
    }

    async fillTitle(title: string): Promise<void> {
        await this.titleInput.fill(title);
        // Tab to trigger save
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
        // Wait for the "Saving..." text to appear and then disappear
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