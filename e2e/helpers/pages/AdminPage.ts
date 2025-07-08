import {Page} from '@playwright/test';

export class AdminPage {
    private readonly page: Page;
    readonly pageUrl: string;

    constructor(page: Page, pageUrl = '/') {
        this.page = page;
        this.pageUrl = pageUrl;
    }

    async logoutByCookieClear() {
        const context = await this.page.context();
        await context.clearCookies();
    }

    async visit(url = null) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit);
    }
}