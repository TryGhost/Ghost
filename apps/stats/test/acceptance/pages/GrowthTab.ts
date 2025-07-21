import AnalyticsPage from './AnalyticsPage.ts';
import {Page} from '@playwright/test';
import {TEST_ROUTES} from '@tryghost/admin-x-framework';

class GrowthTab extends AnalyticsPage {
    constructor(page: Page) {
        super(page);
        this.pageUrl = TEST_ROUTES.STATS.GROWTH;
    }
}

export default GrowthTab;
