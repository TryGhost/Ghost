import {BasePage} from '@/helpers/pages';
import {Locator, Page, expect} from '@playwright/test';

export class PortalSection extends BasePage {
    readonly section: Locator;
    readonly customizeButton: Locator;
    readonly portalModal: Locator;
    readonly linksTab: Locator;
    readonly freeTierToggleLabel: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.section = page.getByTestId('portal');
        this.customizeButton = this.section.getByRole('button', {name: 'Customize'});
        this.portalModal = page.getByTestId('portal-modal');
        this.linksTab = this.portalModal.getByRole('tab', {name: 'Links'});
        this.freeTierToggleLabel = this.portalModal.locator('label').filter({hasText: 'Free'}).first();
    }

    async openCustomizeModal(): Promise<void> {
        await this.customizeButton.click();
        await this.portalModal.waitFor({state: 'visible'});
    }

    async openLinksTab(): Promise<void> {
        await this.linksTab.click();
        await expect(this.linksTab).toHaveAttribute('aria-selected', 'true');
    }

    async getLinkValue(label: string): Promise<string> {
        await this.openLinksTab();
        return await this.portalModal.getByLabel(label).inputValue();
    }
}
