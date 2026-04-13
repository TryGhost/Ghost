import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class PortalNewsletterManagementPage extends PortalPage {
    readonly newsletterToggles: Locator;
    readonly unsubscribeFromAllButton: Locator;
    readonly successNotification: Locator;

    constructor(page: Page) {
        super(page);

        this.newsletterToggles = this.portalFrame.getByTestId('newsletter-toggle');
        this.unsubscribeFromAllButton = this.portalFrame.locator('[data-test-button="unsubscribe-from-all-emails"]');
        this.successNotification = this.portalFrame.getByTestId('popup-notification-success');
    }

    newsletterToggleCheckbox(index: number): Locator {
        return this.newsletterToggles.nth(index).getByRole('checkbox');
    }
}
