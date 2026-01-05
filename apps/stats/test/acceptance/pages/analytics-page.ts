import {Locator, Page} from '@playwright/test';

class AnalyticsPage {
    protected pageUrl:string;
    private readonly page: Page;
    public readonly body: Locator;

    constructor(page: Page) {
        this.page = page;
        this.pageUrl = '/ghost/#/analytics';
        this.body = page.locator('body');
    }

    async visit(url = null) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit);
    }
}

export default AnalyticsPage;
