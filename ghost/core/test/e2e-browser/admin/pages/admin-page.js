class AdminPage {
    pageUrl = '/';

    constructor(page, pageUrl = '/') {
        this.page = page;
        this.pageUrl = pageUrl;
    }

    async logoutByCookieClear() {
        const context = await this.page.context();
        await context.clearCookies();
    }

    async visit() {
        await this.page.goto(this.pageUrl);
    }
}

module.exports = AdminPage;
