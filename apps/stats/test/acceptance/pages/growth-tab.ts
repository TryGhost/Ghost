import {Locator, Page} from '@playwright/test';

export default class GrowthTab {
    readonly page: Page;
    readonly body: Locator;

    constructor(page: Page) {
        this.page = page;
        this.body = page.locator('body');
    }

    async visit() {
        await this.page.goto('/growth');
        // Wait for the page to load
        await this.page.waitForSelector('[data-testid="total-members-card"]');
    }
}
