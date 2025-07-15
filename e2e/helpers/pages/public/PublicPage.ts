import {Locator, Page} from '@playwright/test';

export default class PublicPage {
    protected pageUrl:string;
    private readonly page: Page;
    public readonly body: Locator;

    constructor(page: Page) {
        this.page = page;
        this.pageUrl = '/';
        this.body = page.locator('body');
    }

    async goto(url = null) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit);
    }
}
