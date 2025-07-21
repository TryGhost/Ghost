import {Locator, Page} from '@playwright/test';
import {TEST_ROUTES} from '@tryghost/admin-x-framework';

class AnalyticsPage {
    protected pageUrl:string;
    private readonly page: Page;
    public readonly body: Locator;

    constructor(page: Page) {
        this.page = page;
        this.pageUrl = TEST_ROUTES.STATS.OVERVIEW;
        this.body = page.locator('body');
    }

    async visit(url = null) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit);
    }
}

export default AnalyticsPage;
