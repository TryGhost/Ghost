import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';
import {whatsNewSelectors} from '@tryghost/test-data';

export class WhatsNewBanner extends AdminPage {
    readonly container: Locator;
    readonly closeButton: Locator;
    readonly link: Locator;
    readonly title: Locator;
    readonly excerpt: Locator;

    constructor(page: Page) {
        super(page);

        this.container = page.getByRole('status', {name: whatsNewSelectors.names.banner});
        this.closeButton = this.container.getByRole('button', {name: whatsNewSelectors.names.dismissButton});
        this.link = this.container.getByRole('link');
        this.title = this.container.getByTestId(whatsNewSelectors.testIds.bannerTitle);
        this.excerpt = this.container.getByTestId(whatsNewSelectors.testIds.bannerExcerpt);
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
