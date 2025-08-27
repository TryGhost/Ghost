/**
 * Base admin page object that provides common functionality for all admin pages.
 */
class AdminPage {
    pageUrl = '/';
    page = null;

    /**
     * @param {import('@playwright/test').Page} page - playwright page object
     * @param {string} pageUrl - default url of the page
     */
    constructor(page, pageUrl = '/') {
        this.page = page;
        this.pageUrl = pageUrl;
    }

    async logoutByCookieClear() {
        const context = await this.page.context();
        await context.clearCookies();
    }

    /**
     *
     * @param {string|url} url
     * @returns {Promise<void>}
     */
    async visit(url = null) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit);
    }
}

module.exports = AdminPage;
