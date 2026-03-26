import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

type PaidSignupCadence = 'monthly' | 'yearly';

export class PortalSection extends BasePage {
    readonly section: Locator;
    readonly customizeButton: Locator;
    readonly portalModal: Locator;
    readonly linksTab: Locator;
    readonly linksTierSelectControl: Locator;
    readonly freeTierToggleLabel: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.section = page.getByTestId('portal');
        this.customizeButton = this.section.getByRole('button', {name: 'Customize'});
        this.portalModal = page.getByTestId('portal-modal');
        this.linksTab = this.portalModal.getByRole('tab', {name: 'Links'});
        this.linksTierSelectControl = this.portalModal.locator('span:has-text("Tier:") + div').first();
        this.freeTierToggleLabel = this.portalModal.locator('label').filter({hasText: 'Free'}).first();
    }

    tierCheckbox(tierName: string): Locator {
        return this.portalModal.getByLabel(tierName).first();
    }

    async openCustomizeModal(): Promise<void> {
        await this.customizeButton.click();
        await this.portalModal.waitFor({state: 'visible'});
        await this.portalModal.getByRole('checkbox').first().waitFor();
    }

    async closeCustomizeModal(): Promise<void> {
        await this.portalModal.getByRole('button', {name: 'Close'}).click();
    }

    async openLinksTab(): Promise<void> {
        if (await this.linksTab.getAttribute('aria-selected') === 'true') {
            return;
        }

        await this.linksTab.click();
    }

    async selectLinksTier(name: string): Promise<void> {
        await this.openLinksTab();
        await this.linksTierSelectControl.scrollIntoViewIfNeeded();
        await this.linksTierSelectControl.click();
        await this.page.getByRole('option', {name, exact: true}).click();
    }

    async getPaidSignupLinkForTier(name: string, tierId: string, cadence: PaidSignupCadence): Promise<string> {
        await this.selectLinksTier(name);

        const label = cadence === 'monthly' ? 'Signup / Monthly' : 'Signup / Yearly';
        const linkInput = this.portalModal.getByLabel(label);
        await linkInput.waitFor({state: 'visible'});
        const inputId = await linkInput.getAttribute('id');

        if (!inputId) {
            throw new Error(`Portal ${cadence} signup link input was not found`);
        }

        await this.page.waitForFunction(({expectedTierId, targetInputId}: {expectedTierId: string; targetInputId: string}) => {
            const element = document.getElementById(targetInputId);
            return element instanceof HTMLInputElement && element.value.includes(expectedTierId);
        }, {
            expectedTierId: tierId,
            targetInputId: inputId
        }, {
            timeout: 5000
        });

        return await linkInput.inputValue();
    }

    async getLinkValue(label: string): Promise<string> {
        await this.openLinksTab();
        const linkInput = this.portalModal.getByLabel(label);
        await linkInput.waitFor({state: 'visible'});
        return await linkInput.inputValue();
    }
}
