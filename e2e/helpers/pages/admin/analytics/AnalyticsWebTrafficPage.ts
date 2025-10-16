import {Locator, Page} from '@playwright/test';
import {AdminPage} from '../AdminPage';

export class AnalyticsWebTrafficPage extends AdminPage {
    readonly totalViewsTab: Locator;
    readonly totalUniqueVisitorsTab: Locator;
    private readonly webGraph: Locator;

    readonly topContentCard: Locator;
    readonly postsAndPagesButton: Locator;
    readonly postsButton: Locator;
    readonly pagesButton: Locator;

    public readonly topSourcesCard: Locator;
    public readonly sourcesTab: Locator;
    public readonly campaignsDropdown: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/analytics/web';

        this.totalViewsTab = page.getByRole('tab', {name: 'Total views'});
        this.totalUniqueVisitorsTab = page.getByRole('tab', {name: 'Unique visitors'});

        this.webGraph = page.getByTestId('web-graph');

        this.topContentCard = page.getByTestId('top-content-card');
        this.postsAndPagesButton = this.topContentCard.getByRole('tab', {name: 'Posts & pages'});
        this.postsButton = this.topContentCard.getByRole('tab', {name: 'Posts', exact: true});
        this.pagesButton = this.topContentCard.getByRole('tab', {name: 'Pages', exact: true});

        this.topSourcesCard = page.getByTestId('top-sources-card');
        this.sourcesTab = this.topSourcesCard.getByRole('tab', {name: 'Sources'});
        this.campaignsDropdown = this.topSourcesCard.getByRole('tab', {name: /Campaigns|UTM/});
    }

    async selectCampaignType(campaignType: 'UTM sources' | 'UTM mediums' | 'UTM campaigns' | 'UTM contents' | 'UTM terms') {
        await this.campaignsDropdown.waitFor({state: 'visible'});
        await this.campaignsDropdown.click({force: true});
        await this.page.getByRole('menuitem', {name: campaignType}).click();
        await this.page.waitForLoadState('networkidle');
    }

    async refreshData() {
        await this.page.reload();
        await this.page.waitForLoadState('networkidle');
    }

    async totalViewsContent() {
        return await this.webGraph.textContent();
    }

    async totalUniqueVisitorsContent() {
        return await this.totalUniqueVisitorsTab.textContent();
    }

    async viewTotalViews() {
        await this.totalViewsTab.click();
    }

    async viewTotalUniqueVisitors() {
        await this.totalUniqueVisitorsTab.click();
    }

    async viewWebGraphContent() {
        await this.webGraph.textContent();
    }
}
