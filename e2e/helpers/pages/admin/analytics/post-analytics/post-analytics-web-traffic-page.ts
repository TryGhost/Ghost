import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class PostAnalyticsWebTrafficPage extends AdminPage {
    readonly uniqueVisitorsKpi: Locator;
    readonly totalViewsKpi: Locator;

    readonly topSourcesCard: Locator;
    readonly locationsCard: Locator;

    // Filter-related locators
    readonly filterContainer: Locator;
    readonly filterButton: Locator;
    readonly clearFiltersButton: Locator;

    private postId: string = '';

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/posts/analytics';

        this.uniqueVisitorsKpi = page.getByTestId('unique-visitors-kpi');
        this.totalViewsKpi = page.getByTestId('total-views-kpi');

        this.topSourcesCard = page.getByTestId('top-sources-card');
        this.locationsCard = page.getByTestId('locations-card');

        // Filter elements
        this.filterContainer = page.getByTestId('stats-filter-container');
        this.filterButton = this.filterContainer.getByRole('button', {name: /Filter|Add filter/});
        this.clearFiltersButton = page.getByTestId('stats-filter-clear-button');
    }

    setPostId(postId: string) {
        this.postId = postId;
        this.pageUrl = `/ghost/#/posts/analytics/${postId}/web`;
    }

    async gotoForPost(postId: string) {
        this.setPostId(postId);
        await this.goto();
    }

    async openFilterPopover() {
        await this.filterButton.click();
    }

    getFilterOption(name: string): Locator {
        return this.page.getByRole('option', {name, exact: true});
    }

    getFilterOptionValue(name: string): Locator {
        // Filter option values show as "count name" (e.g., "1 Direct"), so use regex
        return this.page.getByRole('option', {name: new RegExp(`^\\d+\\s+${name}$`)});
    }

    async selectFilterField(label: string) {
        await this.getFilterOption(label).click();
    }

    async selectFilterValue(label: string) {
        await this.getFilterOptionValue(label).click();
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

    /**
     * Click the first location row in the locations card
     * Useful when we don't know what location data will be available
     */
    async clickFirstLocationRow() {
        const firstRow = this.locationsCard.locator('[data-testid^="location-row-"]').first();
        await firstRow.click();
    }

    /**
     * Get the first location row element
     */
    getFirstLocationRow(): Locator {
        return this.locationsCard.locator('[data-testid^="location-row-"]').first();
    }

    /**
     * Get the search params from the current URL
     * The URL is like this: /ghost/#/posts/analytics/{postId}/web?source=direct
     */
    getSearchParams(): URLSearchParams {
        const url = this.page.url();
        const hashQuery = url.split('?')[1] ?? '';
        return new URLSearchParams(hashQuery);
    }

    async gotoWithFilters(filters: Record<string, string>) {
        const params = new URLSearchParams(filters);
        await this.goto(`${this.pageUrl}?${params.toString()}`);
    }
}
