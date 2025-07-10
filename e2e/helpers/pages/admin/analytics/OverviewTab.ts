import {Locator, Page} from '@playwright/test';
import AdminPage from '../AdminPage';

class OverviewTab extends AdminPage {
    public readonly header: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics';
        this.header = page.getByRole('heading', {name: 'Analytics'});
    }
}

export default OverviewTab;
