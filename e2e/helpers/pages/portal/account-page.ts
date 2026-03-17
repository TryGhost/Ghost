import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class PortalAccountPage extends PortalPage {
    readonly title: Locator;
    readonly billingInfoHeading: Locator;
    readonly cancellationNotice: Locator;
    readonly resumeSubscriptionButton: Locator;
    readonly canceledBadge: Locator;
    readonly emailNewsletterHeading: Locator;

    constructor(page: Page) {
        super(page);

        this.title = this.portalFrame.getByRole('heading', {name: 'Your account'});
        this.billingInfoHeading = this.portalFrame.getByRole('heading', {name: 'Billing info & receipts'});
        this.cancellationNotice = this.portalFrame.getByText(/Your subscription has been canceled and will expire on/i);
        this.resumeSubscriptionButton = this.portalFrame.getByRole('button', {name: 'Resume subscription'});
        this.canceledBadge = this.portalFrame.getByText('Canceled', {exact: true});
        this.emailNewsletterHeading = this.portalFrame.getByRole('heading', {name: 'Email newsletter'});
    }

    cardLast4(last4: string): Locator {
        return this.portalFrame.getByText(`**** **** **** ${last4}`);
    }

    emailText(email: string): Locator {
        return this.portalFrame.getByText(email);
    }

    planPrice(priceLabel: string): Locator {
        return this.portalFrame.getByText(priceLabel);
    }
}
