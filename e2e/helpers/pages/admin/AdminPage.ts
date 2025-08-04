import {Locator, Page} from '@playwright/test';

class AdminPage {
    protected pageUrl:string;
    protected readonly page: Page;
    public readonly body: Locator;

    constructor(page: Page) {
        this.page = page;
        this.pageUrl = '/ghost/#/analytics';
        this.body = page.locator('body');
    }

    async goto(url = null) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit);
    }
}

export default AdminPage;
