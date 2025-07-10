import {Page} from '@playwright/test';
import AdminPage from '../AdminPage';

class AnalyticsLocationsPage extends AdminPage {
    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics/locations';
    }
}

export default AnalyticsLocationsPage;
