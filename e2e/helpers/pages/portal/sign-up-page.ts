import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class SignUpPage extends PortalPage {
    readonly emailInput: Locator;
    readonly nameInput: Locator;
    readonly signupButton: Locator;
    readonly signinLink: Locator;
    readonly inviteOnlyNotification: Locator;
    readonly freeTrialNotification: Locator;
    readonly paidTierCard: Locator;
    readonly paidTierSelectButton: Locator;
    readonly continueButton: Locator;

    constructor(page: Page) {
        super(page);

        this.nameInput = this.portalFrame.getByRole('textbox', {name: 'Name'});
        this.emailInput = this.portalFrame.getByRole('textbox', {name: 'Email'});
        this.signupButton = this.portalFrame.getByRole('button', {name: 'Sign up'});
        this.signinLink = this.portalFrame.getByRole('button', {name: 'Sign in'});
        this.inviteOnlyNotification = this.portalFrame.getByTestId('invite-only-notification-text');
        this.freeTrialNotification = this.portalFrame.getByTestId('free-trial-notification-text');
        this.paidTierCard = this.portalFrame.locator('[data-test-tier="paid"]').first();
        this.paidTierSelectButton = this.paidTierCard.locator('[data-test-button="select-tier"]');
        this.continueButton = this.portalFrame.getByRole('button', {name: 'Continue'});
    }

    async fillAndSubmit(email: string, name?: string): Promise<void> {
        if (name) {
            await this.nameInput.fill(name);
        }
        await this.emailInput.fill(email);
        await this.signupButton.click();
    }

    async fillAndSubmitPaidSignup(email: string, name?: string): Promise<void> {
        if (name) {
            await this.nameInput.fill(name);
        }
        await this.emailInput.fill(email);
        await this.selectPaidTier();
        await this.continueIfVisible();
    }

    async selectPaidTier(): Promise<void> {
        await this.paidTierCard.waitFor({state: 'visible'});
        await this.paidTierSelectButton.click();
    }

    async continueIfVisible(): Promise<void> {
        if (await this.continueButton.isVisible()) {
            await this.continueButton.click();
        }
    }
}
