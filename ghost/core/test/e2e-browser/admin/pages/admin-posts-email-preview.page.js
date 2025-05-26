const AdminPage = require('./admin-page');

class AdminPostsEmailPreviewPage extends AdminPage {
    /** @private {import('@playwright/test').Locator} - frame table body locator */
    #tableBody = null;

    /**
     * @param {import('@playwright/test').Page} page - playwright page object
     */
    constructor(page) {
        super(page);

        this.#tableBody = page.frameLocator('iframe.gh-pe-iframe').locator('tbody').first();
    }

    async content() {
        await this.#tableBody.waitFor({state: 'visible'});
        return await this.#tableBody.textContent();
    }

    async closeEmailPreviewForPost() {
        await this.page.keyboard.press('Escape');
        await this.#tableBody.waitFor({state: 'detached'});
    }
}

module.exports = AdminPostsEmailPreviewPage;
