class AdminPage {
    constructor(page) {
        this.page = page;
    }

    async logoutByCookieClear() {
        const context = await this.page.context();
        await context.clearCookies();
    }
}

module.exports = AdminPage;
