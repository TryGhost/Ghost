import { BasePage } from '@/helpers/pages';
import {
  CustomFieldsSection,
  DangerZoneSection,
  IntegrationsSection,
  PortalSection,
  TiersSection,
} from './sections';
import { Locator, Page } from '@playwright/test';
import { StaffSection } from './sections/staff-section';

export class SettingsPage extends BasePage {
  readonly integrationsSection: IntegrationsSection;
  readonly portalSection: PortalSection;
  readonly staffSection: StaffSection;
  readonly tiersSection: TiersSection;
  readonly customFieldsSection: CustomFieldsSection;
  readonly dangerZoneSection: DangerZoneSection;

  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page, '/ghost/#/settings');

    this.searchInput = page.getByRole('textbox', { name: 'Search settings', exact: true });

    this.portalSection = new PortalSection(page);
    this.integrationsSection = new IntegrationsSection(page);
    this.staffSection = new StaffSection(page);
    this.tiersSection = new TiersSection(page);
    this.customFieldsSection = new CustomFieldsSection(page);
    this.dangerZoneSection = new DangerZoneSection(page);
  }

  async goto() {
    const result = await super.goto();
    await this.searchInput.waitFor({ state: 'visible' });
    return result;
  }
}
