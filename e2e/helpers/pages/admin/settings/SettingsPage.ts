import {Locator, Page} from '@playwright/test';
import {BasePage} from '../../BasePage';

export class SettingsPage extends BasePage {
    readonly searchInput: Locator;
    readonly searchClearButton: Locator;

    readonly labsSection: Locator;
    readonly labsHeading: Locator;
    readonly labsDescription: Locator;
    readonly labsOpenButton: Locator;
    readonly labsCloseButton: Locator;
    readonly labsContent: Locator;
    readonly labsBetaFeaturesTab: Locator;
    readonly labsPrivateFeaturesTab: Locator;

    readonly integrationsSection: Locator;
    readonly integrationsHeading: Locator;
    readonly integrationsDescription: Locator;
    readonly integrationsAddButton: Locator;

    readonly labsSidebarItem: Locator;
    readonly integrationsSidebarItem: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.searchInput = page.locator('input[placeholder="Search settings"]');
        this.searchClearButton = page.locator('button[aria-label="close"]').first();

        this.labsSection = page.getByTestId('labs');
        this.labsHeading = page.locator('h5').filter({hasText: 'Labs'});
        this.labsDescription = page.getByText('This is a testing ground for new or experimental features');
        this.labsOpenButton = page.getByTestId('labs').getByRole('button', {name: 'Open'});
        this.labsCloseButton = page.getByTestId('labs').getByRole('button', {name: 'Close'});
        this.labsContent = this.labsSection.locator('[role="tabpanel"]');
        this.labsBetaFeaturesTab = page.getByRole('tab', {name: 'Beta features'});
        this.labsPrivateFeaturesTab = page.getByRole('tab', {name: 'Private features'});

        this.integrationsSection = page.getByTestId('integrations');
        this.integrationsHeading = page.locator('h5').filter({hasText: 'Integrations'});
        this.integrationsDescription = page.getByText('Make Ghost work with apps and tools');
        this.integrationsAddButton = page.getByRole('button', {name: 'Add custom integration'});

        this.labsSidebarItem = page.locator('nav').locator('li').filter({hasText: 'Labs'});
        this.integrationsSidebarItem = page.locator('nav').locator('li').filter({hasText: 'Integrations'});
    }

    async goto() {
        await super.goto();
        await this.page.waitForSelector('h5', {timeout: 10000});
    }

    async isLabsOpen(): Promise<boolean> {
        const closeButtonVisible = await this.labsCloseButton.isVisible().catch(() => false);
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
}
