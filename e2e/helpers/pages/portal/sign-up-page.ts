import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class SignUpPage extends PortalPage {
    readonly monthlySwitchButton: Locator;
    readonly yearlySwitchButton: Locator;
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

        this.monthlySwitchButton = this.portalFrame.locator('[data-test-button="switch-monthly"]');
        this.yearlySwitchButton = this.portalFrame.locator('[data-test-button="switch-yearly"]');
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

    async fillAndSubmitPaidSignup(email: string, name?: string, tierName?: string): Promise<void> {
        if (name) {
            await this.nameInput.fill(name);
        }
        await this.emailInput.fill(email);
        await this.selectPaidTier(tierName);
        await this.continueIfVisible();
    }

    paidTierCardByName(tierName: string): Locator {
        return this.portalFrame.locator('[data-test-tier="paid"]').filter({hasText: tierName}).first();
    }

    tierAmount(tierCard: Locator): Locator {
        return tierCard.getByTestId('product-amount');
    }

    tierDescription(tierCard: Locator): Locator {
        return tierCard.getByTestId('product-description');
    }

    async selectPaidTier(tierName?: string): Promise<void> {
        const paidTierCard = tierName
            ? this.paidTierCardByName(tierName)
            : this.paidTierCard;
        const paidTierSelectButton = tierName
            ? paidTierCard.locator('[data-test-button="select-tier"]')
            : this.paidTierSelectButton;

        await paidTierCard.waitFor({state: 'visible'});
        await paidTierSelectButton.click();
    }

    async switchCadence(cadence: 'monthly' | 'yearly'): Promise<void> {
        if (cadence === 'monthly') {
            await this.monthlySwitchButton.click();
            return;
        }

        await this.yearlySwitchButton.click();
    }

    async continueIfVisible(): Promise<void> {
        if (await this.continueButton.isVisible()) {
            await this.continueButton.click();
        }
    }
}
