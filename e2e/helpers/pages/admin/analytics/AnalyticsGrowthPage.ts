import {Page, Locator} from '@playwright/test';
import {BasePage} from '../../BasePage';
import {AdminPage} from '../AdminPage';

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
        this.campaignsDropdown = this.contentCard.getByRole('tab', {name: 'Campaigns', exact: true});
        this.topContentRows = this.contentCard.locator('tbody tr');
    }

    async openCampaignsDropdown() {
        // force: true because Radix dropdowns add an overlay button on top of the main button
        // eslint-disable-next-line playwright/no-force-option
        await this.campaignsDropdown.click({force: true});
    }

    async selectCampaignType(type: 'UTM mediums' | 'UTM sources' | 'UTM campaigns' | 'UTM terms' | 'UTM contents') {
        const option = this.page.getByRole('menuitem', {name: type});
        await option.click();
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
