import {Page} from '@playwright/test';
import AdminPage from '../AdminPage';

export class AnalyticsGrowthPage extends AdminPage {
    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/analytics/growth';
    }
}
