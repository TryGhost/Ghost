import * as analyticsSel from '@tryghost/test-data/selectors/analytics';
import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

class TotalSubscribersTab {
    public readonly tab: Locator;
    public readonly value: Locator;
    public readonly diff: Locator;

    constructor(page: Page) {
        this.tab = page.getByRole('tab', {name: 'Total subscribers'});
        this.value = page.getByTestId(analyticsSel.totalSubscribersValue);
        this.diff = page.getByTestId(analyticsSel.totalSubscribersValueDiff);
    }
}

export class AnalyticsNewslettersPage extends AdminPage {
    public readonly newslettersCard: Locator;
    public readonly averageOpenRateTab: Locator;
    public readonly averageClickRateTab: Locator;

    public readonly topNewslettersCard: Locator;
    public readonly totalSubscribers: TotalSubscribersTab;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics/newsletters';

        this.newslettersCard = page.getByTestId(analyticsSel.newslettersCard);
        this.topNewslettersCard = page.getByTestId(analyticsSel.topNewslettersCard);

        this.averageOpenRateTab = page.getByRole('tab', {name: 'Avg. open rate'});
        this.averageClickRateTab = page.getByRole('tab', {name: 'Avg. click rate'});
        this.totalSubscribers = new TotalSubscribersTab(page);
    }
}
