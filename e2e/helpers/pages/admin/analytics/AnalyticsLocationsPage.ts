import {Page} from '@playwright/test';
import {TEST_ROUTES} from '@tryghost/admin-x-framework';
import AdminPage from '../AdminPage';

class AnalyticsLocationsPage extends AdminPage {
    constructor(page: Page) {
        super(page);

        this.pageUrl = TEST_ROUTES.STATS.LOCATIONS;
    }
}

export default AnalyticsLocationsPage;
