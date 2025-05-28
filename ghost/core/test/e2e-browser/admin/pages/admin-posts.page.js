const AdminPage = require('./admin-page');

class AdminPostsPage extends AdminPage {
    /** @private {import('@playwright/test').Locator} Locator for publish preview buttons */
    #previewPostButtons = null;

    /** @private {import('@playwright/test').Locator} Locator for email preview buttons */
    #emailPreviewPostButtons = null;

    /**
     * @param {import('@playwright/test').Page} page - playwright page object
     */
    constructor(page) {
        super(page, '/ghost/#/posts');

        this.#previewPostButtons = page.locator('[data-test-button="publish-preview"]');
        this.#emailPreviewPostButtons = page.locator('[data-test-button="email-preview"]');
    }

    async previewPost() {
        await this.#previewPostButtons.first().click();
    }

    async emailPreviewForPost() {
        await this.#emailPreviewPostButtons.waitFor({state: 'visible'});
        await this.#emailPreviewPostButtons.first().click();
    }
}

module.exports = AdminPostsPage;
