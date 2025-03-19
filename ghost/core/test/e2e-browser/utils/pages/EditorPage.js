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
        await expect(this.page.locator('[data-lexical-editor="true"]').first()).toBeVisible();
    }

    async focusBody() {
        await this.page.locator('[data-secondary-instance="false"] [data-lexical-editor]').click();
    }

    async typeInBody(text) {
        await this.focusBody();
        await this.page.keyboard.type(text);
    }

    async checkPostStatus(status, hoverStatus) {
        await this.page.waitForLoadState('networkidle');
        await expect(this.page.locator('[data-test-editor-post-status]').first()).toContainText(status, {timeout: 5000});

        if (hoverStatus) {
            await this.page.locator('[data-test-editor-post-status]').first().hover();
            await expect(this.page.locator('[data-test-editor-post-status]').first()).toContainText(hoverStatus, {timeout: 5000});
        }
    }
}

module.exports = EditorPage;