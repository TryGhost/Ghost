import {appConfig} from '../utils/app-config';
import {PageHttpLogger} from './PageHttpLogger';
import {Locator, Page} from '@playwright/test';

export class BasePage {
    private logger?: PageHttpLogger;
    private readonly debugLogs = appConfig.debugLogs;

    protected pageUrl: string = '';
    protected readonly page: Page;
    public readonly body: Locator;

    constructor(page: Page, pageUrl: string = '') {
        this.page = page;
        this.pageUrl = pageUrl;
        this.body = page.locator('body');

        if (this.isDebugEnabled()) {
            this.logger = new PageHttpLogger(page);
            this.logger.setup();
        }
    }

    async goto(url = null) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit);
    }

    private isDebugEnabled(): boolean {
        return this.debugLogs;
    }
}
