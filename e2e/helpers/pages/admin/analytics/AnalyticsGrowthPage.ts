import {Page} from '@playwright/test';
import AdminPage from '../AdminPage';

class AnalyticsGrowthPage extends AdminPage {
    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/analytics/growth';
    }
}

export default AnalyticsGrowthPage;
