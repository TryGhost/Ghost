import AnalyticsPage from './AnalyticsPage.ts';
import {Page} from '@playwright/test';

class WebTrafficTab extends AnalyticsPage {
    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/analytics/web';
    }
}

export default WebTrafficTab;
