import {appConfig} from '../utils/app-config';
import {PageHttpLogger} from './PageHttpLogger';
import {Locator, Page} from '@playwright/test';

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

    async goto(url = null, options?: pageGotoOptions) {
        const urlToVisit = url || this.pageUrl;
        await this.page.goto(urlToVisit, options);
    }

    public async waitForPageToFullyLoad() {
        await this.page.waitForLoadState('networkidle');
    }

    async pressKey(key: string) {
        await this.page.keyboard.press(key);
    }

    private isDebugEnabled(): boolean {
        return this.debugLogs;
    }
}
