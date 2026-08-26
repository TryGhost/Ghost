import { Locator, Page } from '@playwright/test';
import { PortalPage } from './portal-page';

export class PortalGiftPage extends PortalPage {
  readonly buyerEmailInput: Locator;
  readonly buyerNameInput: Locator;
  readonly continueToDeliveryButton: Locator;
  readonly continueToPaymentButton: Locator;
  readonly giftCardDuration: Locator;
  readonly giftCardValue: Locator;
  readonly giftRedeemLink: Locator;
  readonly personalMessageInput: Locator;
  readonly recipientEmailInput: Locator;
  readonly recipientNameInput: Locator;
  readonly successTitle: Locator;

  constructor(page: Page) {
    super(page);

    this.buyerEmailInput = this.portalFrame.getByLabel('Your email');
    this.buyerNameInput = this.portalFrame.getByLabel('Your name');
    this.continueToDeliveryButton = this.portalFrame.getByRole('button', {
      name: 'Continue to delivery details',
    });
    this.continueToPaymentButton = this.portalFrame.getByRole('button', {
      name: 'Continue to payment',
    });
    this.giftCardDuration = this.portalFrame.getByTestId('gift-card-duration');
    this.giftCardValue = this.portalFrame.getByTestId('gift-card-value');
    this.giftRedeemLink = this.portalFrame.getByTestId('gift-redeem-link');
    this.personalMessageInput = this.portalFrame.getByLabel('Optional message');
    this.recipientEmailInput = this.portalFrame.getByLabel("Recipient's email");
    this.recipientNameInput = this.portalFrame.getByLabel("Recipient's name");
    this.successTitle = this.portalFrame.getByRole('heading', { name: 'Your gift is on its way' });
  }

  durationOption(label: string): Locator {
    return this.portalFrame.getByRole('radio', { name: label, exact: true });
  }

  tierOption(name: string): Locator {
    return this.portalFrame.getByRole('radio').filter({ hasText: name });
  }
}
