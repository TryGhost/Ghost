import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class FakeStripeCheckoutPage extends BasePage {
    readonly title: Locator;

    constructor(page: Page) {
        super(page);

        this.title = page.getByRole('heading', {name: 'Fake Stripe Checkout'});
    }

    async waitUntilLoaded(): Promise<void> {
        await this.title.waitFor({state: 'visible'});
    }
}
