import {Page} from '@playwright/test';
import AdminPage from '../AdminPage';

export class AnalyticsLocationsPage extends AdminPage {
    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics/locations';
    }
}
