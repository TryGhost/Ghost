import {Locator, Page} from '@playwright/test';
import {TEST_ROUTES} from '@tryghost/admin-x-framework';
import AdminPage from '../AdminPage';

export class AnalyticsOverviewPage extends AdminPage {
    public readonly header: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = TEST_ROUTES.STATS.OVERVIEW;
        this.header = page.getByRole('heading', {name: 'Analytics'});
    }
}
