import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';

export class AnalyticsLocationsPage extends AdminPage {
    readonly visitorsCard: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics/locations';

        this.visitorsCard = page.getByTestId('visitors-card');
    }
}
