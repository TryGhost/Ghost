import { Locator, Page } from '@playwright/test';
import { PortalPage } from './portal-page';

/** Portal's gift redemption page, opened from a gift link. */
export class PortalGiftRedemptionPage extends PortalPage {
  /** Only shown to a visitor who isn't signed in. Submitting it emails them a magic link. */
  readonly emailInput: Locator;
  readonly nameInput: Locator;
  readonly redeemButton: Locator;
  /** The success notification. It's shown on the site, because redeeming closes the Portal popup. */
  readonly notification: Locator;

  constructor(page: Page) {
    super(page);

    this.emailInput = this.portalFrame.getByLabel('Your email');
    this.nameInput = this.portalFrame.getByLabel('Your name');
    this.redeemButton = this.portalFrame.getByRole('button', { name: 'Redeem your gift' });
    this.notification = page
      .frameLocator('[data-testid="portal-notification-frame"]')
      .locator('body');
  }

  async gotoGift(token: string): Promise<void> {
    await this.page.goto(`/#/portal/gift/redeem/${encodeURIComponent(token)}`);
    await this.waitForPortalToOpen();
  }
}
