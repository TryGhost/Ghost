import {AdminPage} from '../AdminPage';
import {BasePage} from '../../BasePage';
import {Locator, Page} from '@playwright/test';

class TopContentCard extends BasePage {
    readonly contentCard: Locator;
    readonly postsAndPagesButton: Locator;
    readonly postsButton: Locator;
    readonly pagesButton: Locator;
    readonly sourcesButton: Locator;

    constructor(page: Page) {
        super(page);

        this.contentCard = page.getByTestId('top-content-card');
        this.postsAndPagesButton = this.contentCard.getByRole('tab', {name: 'Posts & pages'});
        this.postsButton = this.contentCard.getByRole('tab', {name: 'Posts', exact: true});
        this.pagesButton = this.contentCard.getByRole('tab', {name: 'Pages', exact: true});
        this.sourcesButton = this.contentCard.getByRole('tab', {name: 'Sources', exact: true});
    }
}

export class AnalyticsGrowthPage extends AdminPage {
    public readonly topContent: TopContentCard;
    public readonly totalMembersCard: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/analytics/growth';

        this.totalMembersCard = page.getByTestId('total-members-card');
        this.topContent = new TopContentCard(page);
    }
}
