import {Locator, Page} from '@playwright/test';
import {AdminPage} from '../AdminPage';

export class SettingsPage extends AdminPage {
    // Search functionality
    readonly searchInput: Locator;
    readonly searchClearButton: Locator;

    // Labs component
    readonly labsSection: Locator;
    readonly labsHeading: Locator;
    readonly labsDescription: Locator;
    readonly labsOpenButton: Locator;
    readonly labsCloseButton: Locator;
    readonly labsContent: Locator;
    readonly labsBetaFeaturesTab: Locator;
    readonly labsPrivateFeaturesTab: Locator;

    // Integrations component (additional component for validation)
    readonly integrationsSection: Locator;
    readonly integrationsHeading: Locator;
    readonly integrationsDescription: Locator;
    readonly integrationsAddButton: Locator;

    // Navigation sidebar items
    readonly labsSidebarItem: Locator;
    readonly integrationsSidebarItem: Locator;

    constructor(page: Page) {
        super(page);

        // Search functionality
        // The search input is inside the settings modal/page
        this.searchInput = page.locator('input[placeholder="Search settings"]');
        this.searchClearButton = page.locator('button[aria-label="close"]').first();

        // Labs component - use test ID for more reliable selection
        this.labsSection = page.getByTestId('labs');
        this.labsHeading = page.locator('h5').filter({hasText: 'Labs'});
        this.labsDescription = page.getByText('This is a testing ground for new or experimental features');
        // The Open/Close buttons are specifically for Labs
        this.labsOpenButton = page.getByTestId('labs').getByRole('button', {name: 'Open'});
        this.labsCloseButton = page.getByTestId('labs').getByRole('button', {name: 'Close'});
        // Labs content is the tabpanel that appears when opened
        this.labsContent = page.locator('[role="tabpanel"]').first();
        this.labsBetaFeaturesTab = page.getByRole('tab', {name: 'Beta features'});
        this.labsPrivateFeaturesTab = page.getByRole('tab', {name: 'Private features'});

        // Integrations component
        this.integrationsSection = page.getByTestId('integrations');
        this.integrationsHeading = page.locator('h5').filter({hasText: 'Integrations'});
        this.integrationsDescription = page.getByText('Make Ghost work with apps and tools');
        this.integrationsAddButton = page.getByRole('button', {name: 'Add custom integration'});

        // Navigation sidebar items
        this.labsSidebarItem = page.locator('nav').locator('li').filter({hasText: 'Labs'});
        this.integrationsSidebarItem = page.locator('nav').locator('li').filter({hasText: 'Integrations'});
    }

    async navigateToSettings() {
        await this.page.goto('/ghost/#/settings');
        await this.page.waitForLoadState('networkidle');
    }

    async searchFor(searchTerm: string) {
        await this.searchInput.fill(searchTerm);
        // Wait a bit for the search to filter results
        await this.page.waitForTimeout(500);
    }

    async clearSearch() {
        if (await this.searchClearButton.isVisible()) {
            await this.searchClearButton.click();
        } else {
            await this.searchInput.clear();
        }
        await this.page.waitForTimeout(500);
    }

    async isLabsOpen(): Promise<boolean> {
        // Check if the Close button is visible (indicating Labs is open)
        const closeButtonVisible = await this.labsCloseButton.isVisible().catch(() => false);
        // Also check if the content is visible
        const contentVisible = await this.labsContent.isVisible().catch(() => false);
        return closeButtonVisible || contentVisible;
    }

    async openLabs() {
        if (!await this.isLabsOpen()) {
            await this.labsOpenButton.click();
            await this.labsContent.waitFor({state: 'visible'});
        }
    }

    async closeLabs() {
        if (await this.isLabsOpen()) {
            await this.labsCloseButton.click();
            await this.labsContent.waitFor({state: 'hidden'});
        }
    }

    async isLabsSectionVisible(): Promise<boolean> {
        return await this.labsSection.isVisible();
    }

    async isIntegrationsSectionVisible(): Promise<boolean> {
        return await this.integrationsSection.isVisible();
    }

    async getVisibleSidebarItems(): Promise<string[]> {
        const items = await this.page.locator('nav li:visible').allTextContents();
        return items.filter(item => item.trim().length > 0);
    }

    async waitForLabsAutoOpen(timeout: number = 3000): Promise<boolean> {
        try {
            await this.labsContent.waitFor({state: 'visible', timeout});
            return true;
        } catch {
            return false;
        }
    }
}