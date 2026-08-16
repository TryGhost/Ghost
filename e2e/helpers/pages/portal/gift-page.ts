import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class PortalGiftPage extends PortalPage {
    readonly buyerEmailInput: Locator;
    readonly continueButton: Locator;
    readonly giftCardDuration: Locator;
    readonly giftCardValue: Locator;
    readonly giftRedeemLink: Locator;
    readonly successTitle: Locator;

    constructor(page: Page) {
        super(page);

        this.buyerEmailInput = this.portalFrame.getByLabel('Your email');
        this.continueButton = this.portalFrame.getByRole('button', {name: 'Continue'});
        this.giftCardDuration = this.portalFrame.getByTestId('gift-card-duration');
        this.giftCardValue = this.portalFrame.getByTestId('gift-card-value');
        this.giftRedeemLink = this.portalFrame.getByTestId('gift-redeem-link');
        this.successTitle = this.portalFrame.getByRole('heading', {name: 'Your gift is ready'});
    }

    durationOption(label: string): Locator {
        return this.portalFrame.getByRole('button', {name: label, exact: true});
    }

    tierOption(name: string): Locator {
        return this.portalFrame.getByRole('radio').filter({hasText: name});
    }
}
