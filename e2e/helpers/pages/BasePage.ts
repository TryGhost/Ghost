import {Locator, Page} from '@playwright/test';
import {PageHttpLogger} from './PageHttpLogger';
import {appConfig} from '../utils/app-config';

export interface pageGotoOptions {
    referer?: string;
    timeout?: number;
    waitUntil?: 'load' | 'domcontentloaded'|'networkidle'|'commit';
}

export class BasePage {
    private logger?: PageHttpLogger;
    private readonly debugLogs = appConfig.debugLogs;

    public pageUrl: string = '';
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

    async goto(url?: string, options?: pageGotoOptions) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit, options);
    }

    async pressKey(key: string) {
        await this.page.keyboard.press(key);
    }

    private isDebugEnabled(): boolean {
        return this.debugLogs;
    }
}
