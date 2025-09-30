import {Page, Locator} from '@playwright/test';
import PublicPage from './PublicPage';

export class HomePage extends PublicPage {
    readonly title: Locator;
    readonly mainSubscribeButton: Locator;
    readonly accountButton: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/';
        this.mainSubscribeButton = page.getByRole('button', {name: 'Subscribe'}).first();
        this.title = page.getByRole('heading', {level: 1});
        this.accountButton = page.locator('[data-portal="account"]').first();
    }

    async waitForSignedIn(): Promise<void> {
        await this.accountButton.waitFor({state: 'visible'});
    }
}
