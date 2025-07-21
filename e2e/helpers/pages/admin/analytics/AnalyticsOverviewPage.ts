import {Locator, Page} from '@playwright/test';
import AdminPage from '../AdminPage';

export class AnalyticsOverviewPage extends AdminPage {
    public readonly header: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics';
        this.header = page.getByRole('heading', {name: 'Analytics'});
    }
}
