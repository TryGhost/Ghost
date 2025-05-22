const AdminPage = require('./admin-page');

class AdminDashboardPage extends AdminPage {
    siteTitle = null;

    /**
     * @param {import('@playwright/test').Page} page - playwright page object
     */
    constructor(page) {
        super(page);

        this.siteTitle = page.locator('.gh-nav-menu');
    }
}

module.exports = AdminDashboardPage;
