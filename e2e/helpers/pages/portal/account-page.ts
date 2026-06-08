import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class PortalAccountPage extends PortalPage {
    readonly title: Locator;
    readonly billingInfoHeading: Locator;
    readonly cancellationNotice: Locator;
    readonly changePlanButton: Locator;
    readonly viewPlansButton: Locator;
    readonly resumeSubscriptionButton: Locator;
    readonly canceledBadge: Locator;
    readonly emailNewsletterHeading: Locator;
    readonly freeTrialLabel: Locator;
    readonly offerLabel: Locator;

    constructor(page: Page) {
        super(page);

        this.title = this.portalFrame.getByRole('heading', {name: 'Your account'});
        this.billingInfoHeading = this.portalFrame.getByRole('heading', {name: 'Billing info & receipts'});
        this.cancellationNotice = this.portalFrame.getByText(/Your subscription has been canceled and will expire on/i);
        this.changePlanButton = this.portalFrame.getByRole('button', {name: 'Change'});
        this.viewPlansButton = this.portalFrame.getByRole('button', {name: 'View plans'});
        this.resumeSubscriptionButton = this.portalFrame.getByRole('button', {name: 'Resume subscription'});
        this.canceledBadge = this.portalFrame.getByText('Canceled', {exact: true});
        this.emailNewsletterHeading = this.portalFrame.getByRole('heading', {name: 'Email newsletter'});
        this.freeTrialLabel = this.portalFrame.getByText(/Free Trial – Ends/i);
        this.offerLabel = this.portalFrame.getByTestId('offer-label');
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

    async openChangePlan(): Promise<void> {
        await this.changePlanButton.click();
    }

    async openPlanSelection(): Promise<void> {
        if (await this.viewPlansButton.isVisible()) {
            await this.viewPlansButton.click();
            return;
        }

        await this.changePlanButton.click();
    }
}
