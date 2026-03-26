import {BasePage} from '@/helpers/pages';
import {IntegrationsSection, LabsSection, PortalSection, PublicationSection, TiersSection} from './sections';
import {Locator, Page} from '@playwright/test';
import {StaffSection} from './sections/staff-section';

export class SettingsPage extends BasePage {
    readonly searchInput: Locator;
    readonly searchClearButton: Locator;

    readonly integrationsSection: IntegrationsSection;
    readonly portalSection: PortalSection;
    readonly publicationSection: PublicationSection;
    readonly labsSection: LabsSection;
    readonly staffSection: StaffSection;
    readonly tiersSection: TiersSection;

    readonly sidebar: Locator;
    readonly labsSidebarLink: Locator;
    readonly staffSidebarLink: Locator;

    readonly timezoneSection: Locator;
    readonly timezoneSelect: Locator;
    readonly timezoneSaveButton: Locator;
    readonly exitSettingsButton: Locator;

    readonly defaultRecipientsSection: Locator;
    readonly defaultRecipientsSelect: Locator;
    readonly defaultRecipientsSaveButton: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.sidebar = page.getByTestId('sidebar');
        this.labsSidebarLink = this.sidebar.getByText('Labs');
        this.staffSidebarLink = this.sidebar.getByText('Staff');

        this.searchInput = page.locator('input[placeholder="Search settings"]');
        this.searchClearButton = page.locator('button[aria-label="close"]').first();

        this.publicationSection = new PublicationSection(page);
        this.portalSection = new PortalSection(page);
        this.labsSection = new LabsSection(page);
        this.integrationsSection = new IntegrationsSection(page);
        this.staffSection = new StaffSection(page);
        this.tiersSection = new TiersSection(page);

        this.timezoneSection = page.getByTestId('timezone');
        this.timezoneSelect = page.getByTestId('timezone-select');
        this.timezoneSaveButton = this.timezoneSection.getByRole('button', {name: 'Save'});
        this.exitSettingsButton = page.getByTestId('exit-settings');

        this.defaultRecipientsSection = page.getByTestId('default-recipients');
        this.defaultRecipientsSelect = page.getByTestId('default-recipients-select');
        this.defaultRecipientsSaveButton = this.defaultRecipientsSection.getByRole('button', {name: 'Save'});
    }

    getSelectOption(text: string | RegExp): Locator {
        return this.page.locator('[data-testid="select-option"]').filter({hasText: text});
    }

    async searchByInput(text: string) {
        await this.searchInput.fill(text);
    }

    async goto() {
        const result = await super.goto();
        await this.sidebar.waitFor({state: 'visible'});
        return result;
    }
}
