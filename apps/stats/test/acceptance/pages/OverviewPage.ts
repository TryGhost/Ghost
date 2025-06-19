import AnalyticsPage from './AnalyticsPage.ts';
import {Locator, Page} from '@playwright/test';

class OverviewPage extends AnalyticsPage {
    public readonly header: Locator;
    public readonly body: Locator;

    constructor(page: Page) {
        super(page);

        this.header = page.getByRole('heading', {name: 'Analytics'});
        this.body = page.locator('body');
    }
}

export default OverviewPage;
