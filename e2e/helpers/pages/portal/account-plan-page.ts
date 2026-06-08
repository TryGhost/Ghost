import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class PortalAccountPlanPage extends PortalPage {
    readonly choosePlanTitle: Locator;
    readonly title: Locator;
    readonly monthlySwitchButton: Locator;
    readonly yearlySwitchButton: Locator;
    readonly confirmActionButton: Locator;

    constructor(page: Page) {
        super(page);

        this.choosePlanTitle = this.portalFrame.getByRole('heading', {name: 'Choose a plan'});
        this.title = this.portalFrame.getByRole('heading', {name: 'Change plan'});
        this.monthlySwitchButton = this.portalFrame.locator('[data-test-button="switch-monthly"]');
        this.yearlySwitchButton = this.portalFrame.locator('[data-test-button="switch-yearly"]');
        this.confirmActionButton = this.portalFrame.locator('[data-test-button="confirm-action"]').first();
    }

    async waitUntilLoaded(): Promise<void> {
        await this.monthlySwitchButton.waitFor({state: 'visible'});
    }

    async switchCadence(cadence: 'monthly' | 'yearly'): Promise<void> {
        if (cadence === 'monthly') {
            await this.monthlySwitchButton.click();
            return;
        }

        await this.yearlySwitchButton.click();
    }

    async selectTier(name: string): Promise<void> {
        const tierCard = this.portalFrame.locator('[data-test-tier="paid"]').filter({hasText: name}).first();

        await tierCard.waitFor({state: 'visible'});
        await tierCard.locator('[data-test-button="select-tier"]').click();
    }

    async confirmAction(): Promise<void> {
        await this.confirmActionButton.click();
    }

    async confirmIfVisible(): Promise<void> {
        if (await this.confirmActionButton.isVisible()) {
            await this.confirmActionButton.click();
        }
    }
}
