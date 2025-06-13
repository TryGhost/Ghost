import {type Page, type Locator, expect} from '@playwright/test';

export class DashboardPage {
    readonly page: Page;
    readonly dashboardTitle: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dashboardTitle = page.getByRole('heading', {name: 'Dashboard', exact: true});
    }

    async expectVisible(timeout: number = 15000) {
        await expect(this.dashboardTitle).toBeVisible({timeout});
    }

    async expectCurrentUrl(timeout: number = 10000) {
        await expect(this.page).toHaveURL(/\/ghost\/#\/dashboard$|\/#\/dashboard$/, {timeout});
    }
}
