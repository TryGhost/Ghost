import {BasePage} from '../../../BasePage';
import {Locator, Page} from '@playwright/test';

export class LabsSection extends BasePage {
    readonly section: Locator;
    readonly heading: Locator;

    readonly openButton: Locator;
    readonly closeButton: Locator;
    readonly content: Locator;

    readonly betaFeaturesTab: Locator;
    readonly privateFeaturesTab: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/labs');

        this.section = page.getByTestId('labs');
        this.heading = page.getByRole('heading', {level: 5, name: 'Labs'});
        this.content = this.section.locator('[role="tabpanel"]');

        this.openButton = page.getByTestId('labs').getByRole('button', {name: 'Open'});
        this.closeButton = page.getByTestId('labs').getByRole('button', {name: 'Close'});

        this.betaFeaturesTab = page.getByRole('tab', {name: 'Beta features'});
        this.privateFeaturesTab = page.getByRole('tab', {name: 'Private features'});
    }

    async isLabsOpen(): Promise<boolean> {
        const closeButtonVisible = await this.closeButton.isVisible().catch(() => false);
        const contentVisible = await this.content.isVisible().catch(() => false);
        return closeButtonVisible || contentVisible;
    }

    async openLabs() {
        if (!await this.isLabsOpen()) {
            await this.openButton.click();
            await this.content.waitFor({state: 'visible'});
        }
    }

    async closeLabs() {
        if (await this.isLabsOpen()) {
            await this.closeButton.click();
            await this.content.waitFor({state: 'hidden'});
        }
    }
}
