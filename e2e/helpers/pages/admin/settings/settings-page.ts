import {BasePage} from '@/helpers/pages';
import {IntegrationsSection, LabsSection, PublicationSection} from './sections';
import {Locator, Page} from '@playwright/test';
import {StaffSection} from './sections/staff-section';

export class SettingsPage extends BasePage {
    readonly searchInput: Locator;
    readonly searchClearButton: Locator;

    readonly integrationsSection: IntegrationsSection;
    readonly publicationSection: PublicationSection;
    readonly labsSection: LabsSection;
    readonly staffSection: StaffSection;

    readonly staffSectionButton: Locator;
    readonly sidebar: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.sidebar = page.getByTestId('sidebar');
        this.searchInput = page.locator('input[placeholder="Search settings"]');
        this.searchClearButton = page.locator('button[aria-label="close"]').first();

        this.staffSectionButton = this.sidebar.getByText('Staff');

        this.publicationSection = new PublicationSection(page);
        this.labsSection = new LabsSection(page);
        this.integrationsSection = new IntegrationsSection(page);
        this.staffSection = new StaffSection(page);
    }

    async searchByInput(text: string) {
        await this.searchInput.fill(text);
    }

    async goto() {
        await super.goto();
        await this.sidebar.waitFor({state: 'visible'});
    }
}
