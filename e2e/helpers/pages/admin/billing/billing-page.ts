import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class BillingPage extends AdminPage {
    public readonly billingIframe: Locator;

    constructor(page: Page) {
        super(page);
        this.billingIframe = page.getByTitle('Billing');
    }

    async waitForBillingIframe(): Promise<Locator> {
        await this.billingIframe.waitFor({state: 'visible', timeout: 10000});
        return this.billingIframe;
    }
}
