const AdminPage = require('./admin-page');

class AdminAnalyticsPage extends AdminPage {
    siteTitle = null;

    /**
     * @param {import('@playwright/test').Page} page - playwright page object
     */
    constructor(page) {
        super(page, '/analytics');

        this.siteTitle = page.locator('.gh-nav-menu');
    }
}

module.exports = AdminAnalyticsPage;