const AdminPage = require('./admin-page');

class AdminPostsEmailPreviewPage extends AdminPage {
    #tableBody = null;

    /**
     * @param {import('@playwright/test').Page} page - playwright page object
     */
    constructor(page) {
        super(page);

        this.#tableBody = page.frameLocator('iframe.gh-pe-iframe').locator('tbody').first();
    }

    async content() {
        return await this.#tableBody.textContent();
    }

    async closeEmailPreviewForPost() {
        await this.page.keyboard.press('Escape');
    }
}

module.exports = AdminPostsEmailPreviewPage;
