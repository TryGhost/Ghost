import { Page } from '@playwright/test';

class OverviewPage {
    private readonly pageUrl:string;
    private readonly page: Page;
    public readonly header;

    constructor(page: Page) {
        this.page = page;
        this.pageUrl = '/ghost/#/analytics';

        this.header = page.getByRole('heading', {name: 'Analytics'});
    }

    async visit(url = null) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit);
    }
}

export default OverviewPage;
