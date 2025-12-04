import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

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

    // Filter-related locators
    public readonly filterContainer: Locator;
    public readonly filterButton: Locator;
    public readonly clearFiltersButton: Locator;
    public readonly locationsCard: Locator;

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

        // Filter elements
        this.filterContainer = page.getByTestId('stats-filter-container');
        this.filterButton = this.filterContainer.getByRole('button', {name: /Filter|Add filter/});
        this.clearFiltersButton = page.getByTestId('stats-filter-clear-button');
        this.locationsCard = page.getByTestId('visitors-card');
    }

    async openFilterPopover() {
        await this.filterButton.click();
    }

    getFilterOption(name: string): Locator {
        return this.page.getByRole('option', {name, exact: true});
    }

    getFilterValue(name: string): Locator {
        return this.page.getByRole('option', {name, exact: true});
    }

    async selectFilterField(label: string) {
        await this.getFilterOption(label).click();
    }

    async selectFilterValue(label: string) {
        await this.getFilterValue(label).click();
    }

    async addFilter(fieldLabel: string, valueLabel: string) {
        await this.openFilterPopover();
        await this.selectFilterField(fieldLabel);
        await this.selectFilterValue(valueLabel);
    }

    getActiveFilter(fieldLabel: string): Locator {
        return this.filterContainer.locator('[data-slot="filter-item"]').filter({hasText: fieldLabel});
    }

    async removeFilter(fieldLabel: string) {
        const filterItem = this.getActiveFilter(fieldLabel);
        await filterItem.locator('[data-slot="filters-remove"]').click();
    }

    async clearAllFilters() {
        await this.clearFiltersButton.click();
    }

    async hasActiveFilter(fieldLabel: string): Promise<boolean> {
        return await this.getActiveFilter(fieldLabel).isVisible();
    }

    async clickSourceToFilter(sourceIdentifier: string) {
        const row = this.page.getByTestId(`source-row-${sourceIdentifier}`);
        await row.click();
    }

    async clickLocationToFilter(locationCode: string) {
        const row = this.page.getByTestId(`location-row-${locationCode}`);
        await row.click();
    }

    getFilterParamsFromUrl(): URLSearchParams {
        const url = new URL(this.page.url());
        return url.searchParams;
    }

    async gotoWithFilters(filters: Record<string, string>) {
        const params = new URLSearchParams(filters);
        await this.goto(`${this.pageUrl}?${params.toString()}`);
    }

    async selectCampaignType(campaignType: 'UTM sources' | 'UTM mediums' | 'UTM campaigns' | 'UTM contents' | 'UTM terms') {
        // force: true is needed because the element is covered by an overlay button
        await this.campaignsDropdown.waitFor({state: 'visible'});
        await this.campaignsDropdown.click({force: true});
        await this.page.getByRole('menuitem', {name: campaignType}).click();
    }

    async refreshData() {
        await this.page.reload();
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
