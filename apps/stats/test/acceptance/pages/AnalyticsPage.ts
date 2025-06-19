import {Page} from '@playwright/test';

class AnalyticsPage {
    protected pageUrl:string;
    private readonly page: Page;

    constructor(page: Page) {
        this.page = page;
        this.pageUrl = '/ghost/#/analytics';
    }

    async visit(url = null) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit);
    }
}

export default AnalyticsPage;
