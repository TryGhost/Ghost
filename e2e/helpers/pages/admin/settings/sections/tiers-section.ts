import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export interface TierFormData {
    name: string;
    description?: string;
    monthlyPrice: string;
    yearlyPrice: string;
}

export class TiersSection extends BasePage {
    readonly section: Locator;
    readonly addTierButton: Locator;
    readonly tierDetailModal: Locator;
    readonly confirmationModal: Locator;
    readonly activeTab: Locator;
    readonly archivedTab: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.section = page.getByTestId('tiers');
        this.addTierButton = this.section.getByRole('button', {name: 'Add tier'});
        this.tierDetailModal = page.getByTestId('tier-detail-modal');
        this.confirmationModal = page.getByTestId('confirmation-modal');
        this.activeTab = this.section.getByRole('tab', {name: 'Active'});
        this.archivedTab = this.section.getByRole('tab', {name: 'Archived'});
    }

    tierCard(slug: string): Locator {
        return this.page.locator(`[data-testid="tier-card"][data-tier="${slug}"]`);
    }

    visibleTierCard(name: string): Locator {
        return this.page.locator('[data-testid="tier-card"]:visible').filter({hasText: name});
    }

    async createTier(data: TierFormData): Promise<void> {
        await this.addTierButton.waitFor();
        await this.addTierButton.click();

        await this.tierDetailModal.getByLabel('Name').fill(data.name);
        if (data.description) {
            await this.tierDetailModal.getByLabel('Description').fill(data.description);
        }
        await this.tierDetailModal.getByLabel('Monthly price').fill(data.monthlyPrice);
        await this.tierDetailModal.getByLabel('Yearly price').fill(data.yearlyPrice);
        await this.tierDetailModal.getByRole('button', {name: 'Save'}).click();
        await this.tierDetailModal.getByRole('button', {name: 'Close'}).click();
        await this.visibleTierCard(data.name).waitFor();
    }

    async openTierModal(slug: string): Promise<void> {
        await this.tierCard(slug).click();
        await this.tierDetailModal.waitFor({state: 'visible'});
    }

    async editTier(data: Partial<TierFormData>): Promise<void> {
        if (data.name) {
            await this.tierDetailModal.getByLabel('Name').fill(data.name);
        }
        if (data.description) {
            await this.tierDetailModal.getByLabel('Description').fill(data.description);
        }
        if (data.monthlyPrice) {
            await this.tierDetailModal.getByLabel('Monthly price').fill(data.monthlyPrice);
        }
        if (data.yearlyPrice) {
            await this.tierDetailModal.getByLabel('Yearly price').fill(data.yearlyPrice);
        }
        await this.tierDetailModal.getByRole('button', {name: 'Save'}).click();
        await this.tierDetailModal.getByRole('button', {name: 'Close'}).click();
    }

    async archiveTier(slug: string): Promise<void> {
        await this.openTierModal(slug);
        await this.tierDetailModal.getByRole('button', {name: 'Archive tier'}).click();
        await this.confirmationModal.getByRole('button', {name: 'Archive'}).click();
        await this.tierDetailModal.getByRole('button', {name: 'Save'}).click();
        await this.tierDetailModal.getByRole('button', {name: 'Close'}).click();
    }

    async unarchiveTier(slug: string): Promise<void> {
        await this.openTierModal(slug);
        await this.tierDetailModal.getByRole('button', {name: 'Reactivate tier'}).click();
        await this.confirmationModal.getByRole('button', {name: 'Reactivate'}).click();
        await this.tierDetailModal.getByRole('button', {name: 'Save'}).click();
        await this.tierDetailModal.getByRole('button', {name: 'Close'}).click();
    }

    async enableTierInPortal(tierName: string): Promise<void> {
        const portalSection = this.page.getByTestId('portal');
        await portalSection.getByRole('button', {name: 'Customize'}).click();
        const portalModal = this.page.getByTestId('portal-modal');
        await portalModal.waitFor({state: 'visible'});

        const tierCheckbox = portalModal.getByLabel(tierName).first();
        if (!await tierCheckbox.isChecked()) {
            await tierCheckbox.check();
        }

        const monthlyCheckbox = portalModal.getByLabel('Monthly').first();
        if (!await monthlyCheckbox.isChecked()) {
            await monthlyCheckbox.check();
        }

        const yearlyCheckbox = portalModal.getByLabel('Yearly').first();
        if (!await yearlyCheckbox.isChecked()) {
            await yearlyCheckbox.check();
        }

        await portalModal.getByRole('button', {name: 'Save'}).click();
        await portalModal.getByRole('button', {name: 'Close'}).click();
    }
}
