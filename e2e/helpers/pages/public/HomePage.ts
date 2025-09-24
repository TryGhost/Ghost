import {Page, Locator} from '@playwright/test';
import PublicPage from './PublicPage';

export class HomePage extends PublicPage {
    readonly title: Locator;
    readonly mainSubscribeButton: Locator;
    readonly accountTrigger: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/';
        this.mainSubscribeButton = page.getByRole('button', {name: 'Subscribe'}).first();
        this.title = page.getByRole('heading', {level: 1});
        this.accountTrigger = page.locator('[data-portal="account"]').first();
    }

    async waitForSignedIn(): Promise<void> {
        await this.accountTrigger.waitFor({state: 'visible'});
    }
}
