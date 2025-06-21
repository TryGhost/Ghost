import AnalyticsPage from './AnalyticsPage.ts';
import {Locator, Page} from '@playwright/test';

class OverviewTab extends AnalyticsPage {
    public readonly header: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics';
        this.header = page.getByRole('heading', {name: 'Analytics'});
    }
}

export default OverviewTab;
