const AdminPage = require('./admin-page');

class AdminPostsPage extends AdminPage {
    #previewPostButtons = null;
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
        this.#previewPostButtons.first().click();
    }

    async emailPreviewForPost() {
        this.page.waitForSelector(this.#emailPreviewPostButtonsSelector);
        this.#emailPreviewPostButtons.first().click();
    }
}

module.exports = AdminPostsPage;
