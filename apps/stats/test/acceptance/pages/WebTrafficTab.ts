import AnalyticsPage from './AnalyticsPage.ts';
import {Page} from '@playwright/test';
import {TEST_ROUTES} from '@tryghost/admin-x-framework';

class WebTrafficTab extends AnalyticsPage {
    constructor(page: Page) {
        super(page);
        this.pageUrl = TEST_ROUTES.STATS.WEB;
    }
}

export default WebTrafficTab;
