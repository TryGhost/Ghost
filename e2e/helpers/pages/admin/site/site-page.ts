import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class SitePage extends AdminPage {
    public readonly siteFrame: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/site';

        // Same test id in both the Ember (templates/site.hbs) and React
        // (embed/site-screen) implementations
        this.siteFrame = page.getByTestId('site-frame');
    }
}
