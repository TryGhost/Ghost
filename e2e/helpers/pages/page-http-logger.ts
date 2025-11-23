import {Page, Request, Response} from '@playwright/test';

export class PageHttpLogger {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public setup() {
        this.page.on('response', this.onResponse);
        this.page.on('requestfailed', this.onRequestFailed);
        this.page.on('pageerror', this.onPageError);
    }

    public destroy() {
        this.page.off('response', this.onResponse);
        this.page.off('requestfailed', this.onRequestFailed);
        this.page.off('pageerror', this.onPageError);
    }

    private onResponse = (response: Response) => {
        if (response.status() >= 400) {
            this.logError(`ERROR - HTTP: ${response.status()} ${response.url()}`);
        }
    };

    private onRequestFailed = (request: Request) => {
        this.logError(`ERROR - NETWORK: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    };

    private onPageError = (error: Error) => {
        this.logError(`ERROR - JS: ${error.message}`);
    };

    private logError = (message: string) => {
        const timestamp = new Date().toISOString();
        // eslint-disable-next-line no-console
        console.error(`[${timestamp}] ${message}`);
    };
}
