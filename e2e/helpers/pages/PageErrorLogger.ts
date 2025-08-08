import {Page, Response, Request} from '@playwright/test';
import {ConsoleMessage} from 'playwright-core';

export class PageErrorLogger {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    public setup() {
        this.page.on('response', this.onResponse);
        this.page.on('requestfailed', this.onRequestFailed);
        this.page.on('pageerror', this.onPageError);
        this.page.on('console', this.onConsole);
    }

    public destroy() {
        this.page.off('response', this.onResponse);
        this.page.off('requestfailed', this.onRequestFailed);
        this.page.off('pageerror', this.onPageError);
        this.page.off('console', this.onConsole);
    }

    // eslint-disable-next-line no-console
    private logError = (message: string) => console.error(message);

    private onResponse = (response: Response) => {
        if (response.status() >= 400) {
            this.logError(`HTTP ERROR: ${response.status()} ${response.url()}`);
        }
    };

    private onRequestFailed = (request: Request) => {
        this.logError(`NETWORK FAILURE: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    };

    private onPageError = (error: Error) => {
        this.logError(`JS ERROR: ${error.message}`);
    };

    private onConsole = (msg: ConsoleMessage) => {
        if (msg.type() === 'error') {
            this.logError(`BROWSER ERROR: ${msg.text()}`);
        }
    };
}
