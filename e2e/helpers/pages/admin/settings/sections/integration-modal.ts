import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export interface IntegrationConfig {
    name: string;
    testId: string;
    modalTestId: string;
    toggleLabel: string;
}

export const INTEGRATIONS = {
    transistor: {
        name: 'Transistor',
        testId: 'transistor-integration',
        modalTestId: 'transistor-modal',
        toggleLabel: 'Enable Transistor'
    },
    pintura: {
        name: 'Pintura',
        testId: 'pintura-integration',
        modalTestId: 'pintura-modal',
        toggleLabel: 'Enable Pintura'
    },
    unsplash: {
        name: 'Unsplash',
        testId: 'unsplash-integration',
        modalTestId: 'unsplash-modal',
        toggleLabel: 'Enable Unsplash'
    },
    firstpromoter: {
        name: 'FirstPromoter',
        testId: 'firstpromoter-integration',
        modalTestId: 'firstpromoter-modal',
        toggleLabel: 'Enable FirstPromoter'
    }
} as const;

export type IntegrationName = keyof typeof INTEGRATIONS;

export class IntegrationModal extends BasePage {
    readonly integrationsSection: Locator;
    readonly integrationItem: Locator;
    readonly modal: Locator;
    readonly enableToggle: Locator;
    readonly saveButton: Locator;
    readonly savedButton: Locator;
    readonly closeButton: Locator;

    private readonly config: IntegrationConfig;

    constructor(page: Page, integration: IntegrationName | IntegrationConfig) {
        super(page, '/ghost/#/settings/integrations');

        this.config = typeof integration === 'string' ? INTEGRATIONS[integration] : integration;

        this.integrationsSection = page.getByTestId('integrations');
        this.integrationItem = page.getByTestId(this.config.testId);
        this.modal = page.getByTestId(this.config.modalTestId);
        this.enableToggle = this.modal.getByLabel(this.config.toggleLabel);
        this.saveButton = this.modal.getByRole('button', {name: 'Save'});
        this.savedButton = this.modal.getByRole('button', {name: 'Saved'});
        this.closeButton = this.modal.getByRole('button', {name: 'Close'});
    }

    get name(): string {
        return this.config.name;
    }

    async isIntegrationVisible(): Promise<boolean> {
        return await this.integrationItem.isVisible();
    }

    async openModal(): Promise<void> {
        await this.integrationItem.click();
        await this.modal.waitFor({state: 'visible'});
    }

    async isEnabled(): Promise<boolean> {
        const ariaChecked = await this.enableToggle.getAttribute('aria-checked');
        return ariaChecked === 'true';
    }

    async enable(): Promise<void> {
        if (!await this.isEnabled()) {
            await this.enableToggle.click();
            await this.waitForToggle(true);
        }
    }

    async disable(): Promise<void> {
        if (await this.isEnabled()) {
            await this.enableToggle.click();
            await this.waitForToggle(false);
        }
    }

    private async waitForToggle(checked: boolean): Promise<void> {
        const toggle = this.modal.getByLabel(this.config.toggleLabel).and(this.page.getByRole('switch', {checked}));
        await toggle.waitFor({state: 'visible'});
    }

    async save(): Promise<void> {
        await this.saveButton.click();
        await this.savedButton.waitFor({state: 'visible'});
    }

    async closeModal(): Promise<void> {
        await this.closeButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }

    async hasActiveBadge(): Promise<boolean> {
        return await this.integrationItem.getByText('Active').isVisible();
    }
}
