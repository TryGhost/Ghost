import AnalyticsPage from './AnalyticsPage.ts';
import {Locator, Page} from '@playwright/test';
import {TEST_ROUTES} from '@tryghost/admin-x-framework';

class OverviewTab extends AnalyticsPage {
    public readonly header: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = TEST_ROUTES.STATS.OVERVIEW;
        this.header = page.getByRole('heading', {name: 'Analytics'});
    }
}

export default OverviewTab;
