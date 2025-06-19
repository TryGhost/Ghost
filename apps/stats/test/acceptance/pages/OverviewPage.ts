import AnalyticsPage from './AnalyticsPage.ts';
import {Page} from '@playwright/test';

class OverviewPage extends AnalyticsPage {
    public readonly header;
    public readonly body;

    constructor(page: Page) {
        super(page);

        this.header = page.getByRole('heading', {name: 'Analytics'});
        this.body = page.locator('body');
    }
}

export default OverviewPage;
