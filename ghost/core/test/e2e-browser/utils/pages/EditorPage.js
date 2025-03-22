const {expect} = require('@playwright/test');

/**
 * Page object model for the editor page
 * https://playwright.dev/docs/pom
 * @typedef {Object} EditorPageOptions
 * @property {string} [type] The type of editor to open. Can be 'post' or 'page'.
 */
class EditorPage {
    constructor(page) {
        this.page = page;
        this.titleInput = this.page.locator('[data-test-editor-title-input]');
        this.editor = this.page.locator('[data-secondary-instance="false"] [data-lexical-editor]');
        this.postStatus = this.page.locator('[data-test-editor-post-status]').first();
        this.psmButton = this.page.locator('[data-test-editor-psm-trigger]');
        this.breadcrumb = this.page.locator('[data-test-breadcrumb]');
        this.createPostPromise = this.getCreatePostPromise();
    }

    /**
     * Navigates to a blank new post or page
     * @param {'post' | 'page'} type 
     */
    async goto(type = 'post') {
        await this.page.goto('/ghost');
        if (type === 'post') {
            await this.page.goto('/ghost/#/editor/post/');
        } else if (type === 'page') {
            await this.page.goto('/ghost/#/editor/page/');
        } else {
            throw new Error(`Invalid type: ${type}`);
        }
        await expect(this.editor).toBeVisible();
    }

    /**
     * Blurs the title input
     */
    async blurTitle() {
        await this.titleInput.blur();
    }

    /**
     * Fill the title input with the provided text
     * @param {string} text
     */
    async fillTitle(text) {
        await this.titleInput.fill(text);
    }

    /**
     * Sets the title to the provided text, overwriting any existing text, and optionally blurs the input
     * @param {string} text 
     * @param {Object} options
     * @param {boolean} [options.blur] Whether to blur the input after setting the title
     */
    async setTitle(text, options = {}) {
        await this.titleInput.clear();
        await this.titleInput.fill(text);
        if (options.blur) {
            await this.blurTitle();
        }
    }

    /**
     * Fills the editor with the provided text
     * @param {string} text
     */
    async fillBody(text) {
        await this.editor.fill(text);
    }

    /**
     * Sets the editor to the provided text, overwriting any existing text
     * @param {string} text 
     * @param {Object} options
     * @param {boolean} [options.triggerAutosave] Whether to trigger an autosave
     */
    async setBody(text, options = {}) {
        await this.editor.clear();
        await this.fillBody(text);
        if (options.triggerAutosave) {
            await this.triggerAutosave();
        }
    }

    /**
     * Triggers an autosave by fast forwarding the clock by 5 seconds
     * This saves us 3 seconds of waiting for the autosave to trigger
     */
    async triggerAutosave() {
        await this.page.clock.install();
        await this.page.clock.fastForward('00:05');
    }

    /**
     * Waits for a successful response from the POST /posts endpoint
     * @returns {Promise<import('@playwright/test').Response>} Playwright response object
     */
    async waitForCreatePostResponse() {
        const response = await this.createPostPromise;
        return response;
    }

    /**
     * Checks that the post status is the provided status
     * @param {string} status
     */
    async checkPostStatus(status) {
        await this.page.waitForLoadState('networkidle');
        await expect(this.postStatus).toContainText(status, {timeout: 10000});
    }

    /**
     * Returns a promise that resolves when a successful response from the POST /posts endpoint is received
     * @returns {Promise<import('@playwright/test').Response>} Playwright response object
     */
    getCreatePostPromise() {
        return this.page.waitForResponse((response) => {
            return response.request().method() === 'POST' &&
                response.url().includes('/ghost/api/admin/posts/') &&
                response.status() === 201;
        });
    }
}

module.exports = EditorPage;