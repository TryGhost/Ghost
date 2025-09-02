import {Page, Locator} from '@playwright/test';
import {AdminPage} from '../AdminPage';

export class AnalyticsLocationsPage extends AdminPage {
    readonly visitorsCard: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics/locations';

        this.visitorsCard = page.getByTestId('visitors-card');
    }
}
