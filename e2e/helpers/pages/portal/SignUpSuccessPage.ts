import {Locator, Page} from '@playwright/test';
import {PortalPage} from './PortalPage';

export class SignUpSuccessPage extends PortalPage {
    readonly successIcon: Locator;
    readonly successTitle: Locator;
    readonly successMessage: Locator;
    readonly closeButton: Locator;

    constructor(page: Page) {
        super(page);

        this.successIcon = this.portalFrame.locator('img').first();
        this.successTitle = this.portalFrame.getByRole('heading', {name: 'Now check your email!'});
        this.successMessage = this.portalFrame.getByText('To complete signup, click the confirmation link in your inbox');
        this.closeButton = this.portalFrame.getByRole('button', {name: 'Close'});
    }

    async waitForSignUpSuccess(): Promise<void> {
        await this.successMessage.waitFor({state: 'visible'});
    }
}