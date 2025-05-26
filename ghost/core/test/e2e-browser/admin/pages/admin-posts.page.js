const AdminPage = require('./admin-page');

class AdminPostsPage extends AdminPage {
    /** @private {import('@playwright/test').Locator} Locator for publish preview buttons */
    #previewPostButtons = null;

    /** @private {import('@playwright/test').Locator} Locator for email preview buttons */
    #emailPreviewPostButtons = null;
    #emailPreviewPostButtonsSelector = '[data-test-button="email-preview"]';

    /**
     * @param {import('@playwright/test').Page} page - playwright page object
     */
    constructor(page) {
        super(page, '/ghost/#/posts');

        this.#previewPostButtons = page.locator('[data-test-button="publish-preview"]');
        this.#emailPreviewPostButtons = page.locator(this.#emailPreviewPostButtonsSelector);
    }

    async previewPost() {
        await this.#previewPostButtons.first().click();
    }

    async emailPreviewForPost() {
        await this.page.waitForSelector(this.#emailPreviewPostButtonsSelector);
        await this.#emailPreviewPostButtons.first().click();
    }
}

module.exports = AdminPostsPage;
