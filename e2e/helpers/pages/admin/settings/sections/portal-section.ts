import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

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
        if (await this.linksTab.getAttribute('aria-selected') === 'true') {
            return;
        }

        await this.linksTab.click();
    }

    async getLinkValue(label: string): Promise<string> {
        await this.openLinksTab();
        const linkInput = this.portalModal.getByLabel(label);
        await linkInput.waitFor({state: 'visible'});
        return await linkInput.inputValue();
    }
}
