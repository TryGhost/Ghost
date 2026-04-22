import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class PortalAccountHomePage extends PortalPage {
    readonly signOutButton: Locator;
    readonly manageNewslettersButton: Locator;
    readonly defaultNewsletterToggle: Locator;
    readonly defaultNewsletterCheckbox: Locator;
    readonly signinSwitchButton: Locator;

    constructor(page: Page) {
        super(page);

        this.signOutButton = this.portalFrame.locator('[data-test-button="footer-signout"]');
        this.manageNewslettersButton = this.portalFrame.locator('[data-test-button="manage-newsletters"]');
        this.defaultNewsletterToggle = this.portalFrame.getByTestId('default-newsletter-toggle');
        this.defaultNewsletterCheckbox = this.portalFrame.locator('#default-newsletter-toggle');
        this.signinSwitchButton = this.portalFrame.getByTestId('signin-switch');
    }

    async signOut(): Promise<void> {
        await this.signOutButton.click();
    }
}
