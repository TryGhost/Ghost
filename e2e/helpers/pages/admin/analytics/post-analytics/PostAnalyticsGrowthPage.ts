import {Locator, Page} from '@playwright/test';
import {BasePage} from '../../../BasePage';
import {AdminPage} from '../../AdminPage';

class TopSourcesCard extends BasePage {
    readonly contentCard: Locator;
    readonly sourcesButton: Locator;
    readonly campaignsDropdown: Locator;
    readonly topContentRows: Locator;

    constructor(page: Page) {
        super(page);

        this.contentCard = page.getByTestId('top-sources-card');
        this.sourcesButton = this.contentCard.getByRole('tab', {name: 'Sources', exact: true});
        this.campaignsDropdown = this.contentCard.getByRole('tab', {name: 'Campaigns', exact: true});
        this.topContentRows = this.contentCard.locator('tbody tr');
    }

    async openCampaignsDropdown() {
        // force: true because Radix dropdowns add an overlay button on top of the main button
        await this.campaignsDropdown.click({force: true});
    }

    async selectCampaignType(type: 'UTM sources' | 'UTM mediums' | 'UTM campaigns' | 'UTM contents' | 'UTM terms') {
        const option = this.page.getByRole('menuitem', {name: type});
        await option.click();
    }
}

export class PostAnalyticsGrowthPage extends AdminPage {
    readonly membersCard: Locator;
    readonly viewMemberButton: Locator;
    readonly topSourcesCard: Locator;
    readonly topContent: TopSourcesCard;

    constructor(page: Page) {
        super(page);

        this.membersCard = this.page.getByTestId('members-card');
        this.viewMemberButton = this.membersCard.getByRole('button', {name: 'View member'});

        this.topSourcesCard = this.page.getByTestId('top-sources-card');
        this.topContent = new TopSourcesCard(page);
    }
}
