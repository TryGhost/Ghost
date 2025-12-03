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

    /**
     * Check if the filter UI is visible (requires utmTracking lab flag)
     */
    async isFilterUIVisible(): Promise<boolean> {
        return await this.filterContainer.isVisible();
    }

    /**
     * Open the filter popover by clicking the Filter button
     */
    async openFilterPopover() {
        await this.filterButton.click();
    }

    /**
     * Add a filter by selecting a field and value from the filter popover
     */
    async addFilter(fieldLabel: string, valueLabel: string) {
        await this.openFilterPopover();
        // Select the field from the dropdown
        await this.page.getByRole('option', {name: fieldLabel}).click();
        // Select the value
        await this.page.getByRole('option', {name: valueLabel}).click();
    }

    /**
     * Get a locator for a specific active filter pill
     */
    getActiveFilter(fieldLabel: string): Locator {
        return this.filterContainer.locator('[data-slot="filter-item"]').filter({hasText: fieldLabel});
    }

    /**
     * Remove a specific filter by clicking its remove button
     */
    async removeFilter(fieldLabel: string) {
        const filterItem = this.getActiveFilter(fieldLabel);
        await filterItem.locator('[data-slot="filters-remove"]').click();
    }

    /**
     * Clear all filters using the Clear button
     */
    async clearAllFilters() {
        await this.clearFiltersButton.click();
    }

    /**
     * Check if a filter is currently active
     */
    async hasActiveFilter(fieldLabel: string): Promise<boolean> {
        return await this.getActiveFilter(fieldLabel).isVisible();
    }

    /**
     * Click on a source row to add it as a filter
     */
    async clickSourceToFilter(sourceIdentifier: string) {
        const row = this.page.getByTestId(`source-row-${sourceIdentifier}`);
        await row.click();
    }

    /**
     * Click on a location row to add it as a filter
     */
    async clickLocationToFilter(locationCode: string) {
        const row = this.page.getByTestId(`location-row-${locationCode}`);
        await row.click();
    }

    /**
     * Get the current URL with filter parameters
     */
    getFilterParamsFromUrl(): URLSearchParams {
        const url = new URL(this.page.url());
        return url.searchParams;
    }

    /**
     * Navigate to the page with specific filter parameters pre-set in URL
     */
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
