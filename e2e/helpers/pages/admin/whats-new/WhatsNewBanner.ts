import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';

export class WhatsNewBanner extends AdminPage {
    readonly container: Locator;
    readonly closeButton: Locator;
    readonly link: Locator;
    readonly title: Locator;
    readonly excerpt: Locator;

    constructor(page: Page) {
        super(page);

        this.container = page.getByRole('status', {name: /what’s new notification/i});
        this.closeButton = this.container.getByRole('button', {name: /dismiss/i});
        this.link = this.container.getByRole('link');
        this.title = this.container.locator('[data-test-toast-title]');
        this.excerpt = this.container.locator('[data-test-toast-excerpt]');
    }

    async dismiss(): Promise<void> {
        await this.closeButton.click();
        await this.container.waitFor({state: 'hidden'});
    }

    async clickLink(): Promise<void> {
        await this.link.click();
    }

    async clickLinkAndClosePopup(): Promise<void> {
        const [popup] = await Promise.all([
            this.page.waitForEvent('popup'),
            this.clickLink()
        ]);
        await popup.close();
    }

    async waitForBanner(): Promise<void> {
        await this.container.waitFor({state: 'visible'});
    }
}
