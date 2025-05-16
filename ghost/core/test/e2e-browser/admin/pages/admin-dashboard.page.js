const AdminPage = require('./admin-page');

class AdminDashboardPage extends AdminPage {
    siteTitle = null;

    constructor(page) {
        super(page);

        this.siteTitle = page.locator('.gh-nav-menu');
    }
}

module.exports = AdminDashboardPage;
