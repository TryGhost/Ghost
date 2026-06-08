import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class PortalOfferPage extends PortalPage {
    readonly nameInput: Locator;
    readonly emailInput: Locator;
    readonly submitButton: Locator;
    readonly continueButton: Locator;
    readonly offerTitle: Locator;
    readonly discountLabel: Locator;
    readonly offerMessage: Locator;
    readonly updatedPrice: Locator;

    constructor(page: Page) {
        super(page);

        this.nameInput = this.portalFrame.getByRole('textbox', {name: 'Name'});
        this.emailInput = this.portalFrame.getByRole('textbox', {name: 'Email'});
        this.submitButton = this.portalFrame.getByRole('button', {name: /Continue|Start .* free trial|Retry/});
        this.continueButton = this.portalFrame.getByRole('button', {name: 'Continue'});
        this.offerTitle = this.portalFrame.getByTestId('offer-title');
        this.discountLabel = this.portalFrame.getByTestId('offer-discount-label');
        this.offerMessage = this.portalFrame.getByTestId('offer-message');
        this.updatedPrice = this.portalFrame.getByTestId('offer-updated-price');
    }

    async fillAndSubmit(email: string, name?: string): Promise<void> {
        if (name) {
            await this.nameInput.fill(name);
        }

        await this.emailInput.fill(email);
        await this.submitButton.click();
    }

    async continueIfVisible(): Promise<void> {
        if (await this.continueButton.isVisible()) {
            await this.continueButton.click();
        }
    }

    async waitForOfferPage(): Promise<void> {
        await this.waitForPortalToOpen();
        await this.emailInput.waitFor({state: 'visible'});
        await this.offerTitle.waitFor({state: 'visible'});
    }
}
