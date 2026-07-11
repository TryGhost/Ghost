import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';
import {bannerLabel, dismissButton, whatsNewBannerExcerpt, whatsNewBannerTitle} from '@tryghost/test-data/selectors/whats-new';

export class WhatsNewBanner extends AdminPage {
    readonly container: Locator;
    readonly closeButton: Locator;
    readonly link: Locator;
    readonly title: Locator;
    readonly excerpt: Locator;

    constructor(page: Page) {
        super(page);

        this.container = page.getByRole('status', {name: bannerLabel});
        this.closeButton = this.container.getByRole('button', {name: dismissButton});
        this.link = this.container.getByRole('link');
        this.title = this.container.getByTestId(whatsNewBannerTitle);
        this.excerpt = this.container.getByTestId(whatsNewBannerExcerpt);
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
