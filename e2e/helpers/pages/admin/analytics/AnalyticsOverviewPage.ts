import {Locator, Page} from '@playwright/test';
import AdminPage from '../AdminPage';

export class AnalyticsOverviewPage extends AdminPage {
    public readonly header: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/analytics';
        this.header = page.getByRole('heading', {name: 'Analytics'});
    }

    // Locators
    get uniqueVisitorsCard(): Locator {
        // Look for the card containing "Unique visitors" text
        return this.page.locator('div:has-text("Unique visitors")').first();
    }

    get uniqueVisitorsCount(): Locator {
        // The count is the large number displayed in the card
        // Using a more specific selector based on the visible DOM
        return this.page.locator('div:has-text("Unique visitors")').locator('xpath=following-sibling::div[1]').first();
    }

    get pageViewsCard(): Locator {
        return this.page.locator('section').filter({hasText: 'Page views'}).first();
    }

    get pageViewsCount(): Locator {
        // Find the section containing "Page views" and get the numeric value
        return this.page.locator('section').filter({hasText: 'Page views'}).locator('div').filter({hasText: /^\d+$/}).first();
    }

    // Actions
    async waitForAnalyticsToLoad(): Promise<void> {
        await this.header.waitFor({state: 'visible'});
        // Wait for the page to be fully loaded by checking for a stable element
        await this.page.waitForLoadState('networkidle');
        // Additional wait to ensure data is rendered
        await this.page.waitForTimeout(2000);
    }

    // Assertions
    async assertUniqueVisitorCount(expected: number): Promise<void> {
        await this.uniqueVisitorsCount.waitFor({state: 'visible'});
        const text = await this.uniqueVisitorsCount.textContent();
        const count = parseInt(text?.replace(/,/g, '') || '0');
        if (count !== expected) {
            throw new Error(`Expected ${expected} unique visitors but found ${count}`);
        }
    }

    async assertPageViewCount(expected: number): Promise<void> {
        await this.pageViewsCount.waitFor({state: 'visible'});
        const text = await this.pageViewsCount.textContent();
        const count = parseInt(text?.replace(/,/g, '') || '0');
        if (count !== expected) {
            throw new Error(`Expected ${expected} page views but found ${count}`);
        }
    }
}
