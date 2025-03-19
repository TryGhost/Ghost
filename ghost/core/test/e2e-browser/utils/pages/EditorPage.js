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
    }

    async goto(type = 'post') {
        await this.page.goto('/ghost');
        if (type === 'post') {
            await this.page.goto('/ghost/#/editor/post/');
        } else if (type === 'page') {
            await this.page.goto('/ghost/#/editor/page/');
        } else {
            throw new Error(`Invalid type: ${type}`);
        }

        // wait for editor to be ready
        await expect(this.editor).toBeVisible();
    }

    async focusTitle() {
        await this.titleInput.click();
    }

    async blurTitle() {
        await this.titleInput.blur();
    }

    async typeInTitle(text) {
        await this.focusTitle();
        await this.page.keyboard.type(text);
        await this.blurTitle();
    }

    async focusEditor() {
        await this.editor.click();
    }

    async typeInEditor(text) {
        await this.focusEditor();
        await this.page.keyboard.type(text);
    }

    async checkPostStatus(status, hoverStatus) {
        await this.page.waitForLoadState('networkidle');
        await expect(this.postStatus).toContainText(status, {timeout: 10000});

        if (hoverStatus) {
            await this.postStatus.hover();
            await expect(this.postStatus).toContainText(hoverStatus, {timeout: 5000});
        }
    }
}

module.exports = EditorPage;