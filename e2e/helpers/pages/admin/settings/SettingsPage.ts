import {Locator, Page} from '@playwright/test';
import {BasePage} from '../../BasePage';
import {PublicationSection, LabsSection, IntegrationsSection} from './sections';

export class SettingsPage extends BasePage {
    readonly searchInput: Locator;
    readonly searchClearButton: Locator;

    readonly integrationsSection: IntegrationsSection;
    readonly publicationSection: PublicationSection;
    readonly labsSection: LabsSection;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.searchInput = page.locator('input[placeholder="Search settings"]');
        this.searchClearButton = page.locator('button[aria-label="close"]').first();

        this.publicationSection = new PublicationSection(page);
        this.labsSection = new LabsSection(page);
        this.integrationsSection = new IntegrationsSection(page);
    }

    async searchByInput(text: string) {
        await this.searchInput.fill(text);
        await this.page.waitForTimeout(300);
    }

    async goto() {
        await super.goto();
        await this.page.waitForSelector('h5', {timeout: 10000});
    }
}
