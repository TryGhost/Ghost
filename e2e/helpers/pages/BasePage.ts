import {PageErrorLogger} from './PageErrorLogger';
import {Locator, Page} from '@playwright/test';

export class BasePage {
    private logger: PageErrorLogger;

    protected pageUrl: string = '';
    protected readonly page: Page;
    public readonly body: Locator;

    constructor(page: Page, pageUrl: string) {
        this.page = page;
        this.pageUrl = pageUrl;
        this.body = page.locator('body');
        this.logger = new PageErrorLogger(page);

        this.logger.setup();
    }

    async goto(url = null) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit);
    }
}
