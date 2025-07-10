import {Page} from '@playwright/test';
import AdminPage from '../AdminPage';

class AnalyticsWebTrafficPage extends AdminPage {
    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/analytics/web';
    }
}

export default AnalyticsWebTrafficPage;
