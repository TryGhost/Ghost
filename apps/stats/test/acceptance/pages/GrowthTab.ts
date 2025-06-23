import AnalyticsPage from './AnalyticsPage.ts';
import {Page} from '@playwright/test';

class GrowthTab extends AnalyticsPage {
    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/analytics/growth';
    }
}

export default GrowthTab;
