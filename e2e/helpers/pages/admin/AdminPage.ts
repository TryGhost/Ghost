import {Locator, Page} from '@playwright/test';
import {TEST_ROUTES} from '@tryghost/admin-x-framework';

class AdminPage {
    protected pageUrl:string;
    protected readonly page: Page;
    public readonly body: Locator;

    constructor(page: Page) {
        this.page = page;
        this.pageUrl = TEST_ROUTES.STATS.OVERVIEW;
        this.body = page.locator('body');
    }

    async goto(url = null) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit);
    }
}

export default AdminPage;
