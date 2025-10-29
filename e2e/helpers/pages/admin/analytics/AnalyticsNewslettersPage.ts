import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';

export class AnalyticsNewslettersPage extends AdminPage {
    public readonly newslettersCard: Locator;
    public readonly totalSubscribersTab: Locator;
    public readonly averageOpenRateTab: Locator;
    public readonly averageClickRateTab: Locator;

    public readonly topNewslettersCard: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics/newsletters';

        this.newslettersCard = page.getByTestId('newsletters-card');
        this.topNewslettersCard = page.getByTestId('top-newsletters-card');

        this.averageOpenRateTab = page.getByRole('tab', {name: 'Avg. open rate'});
        this.averageClickRateTab = page.getByRole('tab', {name: 'Avg. click rate'});
        this.totalSubscribersTab = page.getByRole('tab', {name: 'Total subscribers'});
    }
}
