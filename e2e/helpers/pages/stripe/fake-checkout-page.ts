import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class FakeStripeCheckoutPage extends BasePage {
    readonly title: Locator;
    readonly totalAmount: Locator;
    readonly changeAmountButton: Locator;
    readonly customAmountInput: Locator;
    readonly emailInput: Locator;
    readonly cardTabButton: Locator;
    readonly submitButton: Locator;

    constructor(page: Page) {
        super(page);

        this.title = page.getByRole('heading', {name: 'Fake Stripe Checkout'});
        this.totalAmount = page.getByTestId('product-summary-total-amount');
        this.changeAmountButton = page.getByRole('button', {name: 'Change amount'});
        this.customAmountInput = page.locator('#customUnitAmount');
        this.emailInput = page.locator('#email');
        this.cardTabButton = page.getByTestId('card-tab-button');
        this.submitButton = page.getByTestId('hosted-payment-submit-button');
    }

    async waitUntilLoaded(): Promise<void> {
        await this.title.waitFor({state: 'visible'});
    }

    async waitUntilDonationReady(): Promise<void> {
        await this.waitUntilLoaded();
        await this.totalAmount.waitFor({state: 'visible'});
    }

    async changeAmountTo(amount: string): Promise<void> {
        if (!await this.customAmountInput.isVisible()) {
            await this.changeAmountButton.click();
        }
        await this.customAmountInput.fill(amount);
    }

    async fillEmail(email: string): Promise<void> {
        await this.emailInput.fill(email);
    }

    async getEmail(): Promise<string> {
        return await this.emailInput.inputValue();
    }

    async getAmountInCents(): Promise<number> {
        if (!await this.customAmountInput.isVisible()) {
            await this.changeAmountButton.click();
        }

        const value = await this.customAmountInput.inputValue();
        const normalizedValue = value.replace(/[^0-9.]/g, '');
        const parsed = Number.parseFloat(normalizedValue);

        if (!Number.isFinite(parsed)) {
            throw new Error(`Invalid donation amount: ${value}`);
        }

        return Math.round(parsed * 100);
    }

    async submitPayment(): Promise<void> {
        await this.submitButton.click();
    }
}
