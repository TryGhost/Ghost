import {Page} from "@playwright/test";

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

    protected debugHttp() {
        this.page.on('request', request => {
            console.debug('>>', request.method(), request.url());
        });

        this.page.on('response', async response => {
            console.debug('<<', response.status(), response.url());

            if (response.request().resourceType() === 'xhr') {
                console.debug('Body:', await response.text());
            }
        });
    }
}

export default AnalyticsPage;
