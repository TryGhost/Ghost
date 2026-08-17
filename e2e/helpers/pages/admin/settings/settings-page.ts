import {BasePage} from '@/helpers/pages';
import {CustomFieldsSection, DangerZoneSection, IntegrationsSection, PortalSection, TiersSection} from './sections';
import {Locator, Page} from '@playwright/test';
import {StaffSection} from './sections/staff-section';

export class SettingsPage extends BasePage {
    readonly integrationsSection: IntegrationsSection;
    readonly portalSection: PortalSection;
    readonly staffSection: StaffSection;
    readonly tiersSection: TiersSection;
    readonly customFieldsSection: CustomFieldsSection;
    readonly dangerZoneSection: DangerZoneSection;

    readonly sidebar: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.sidebar = page.getByTestId('sidebar');

        this.portalSection = new PortalSection(page);
        this.integrationsSection = new IntegrationsSection(page);
        this.staffSection = new StaffSection(page);
        this.tiersSection = new TiersSection(page);
        this.customFieldsSection = new CustomFieldsSection(page);
        this.dangerZoneSection = new DangerZoneSection(page);
    }

    async goto() {
        const result = await super.goto();
        await this.sidebar.waitFor({state: 'visible'});
        return result;
    }
}
