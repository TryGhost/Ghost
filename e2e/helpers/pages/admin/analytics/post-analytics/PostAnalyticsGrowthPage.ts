import {Locator, Page} from '@playwright/test';
import {AdminPage} from '../../AdminPage';

export class PostAnalyticsGrowthPage extends AdminPage {
    public readonly topSourcesCard: Locator;

    constructor(page: Page) {
        super(page);

        this.topSourcesCard = this.page.getByTestId('top-sources-card');
    }
}
