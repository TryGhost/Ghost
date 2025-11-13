import AnalyticsPage from './analytics-page.ts';
import {Page} from '@playwright/test';

class LocationsTab extends AnalyticsPage {
    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics/locations';
    }
}

export default LocationsTab;
