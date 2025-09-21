import {Page} from '@playwright/test';
import {BasePage} from '../BasePage';

export default class PublicPage extends BasePage{
    private readonly portalFrameSelector = '[data-testid="portal-popup-frame"]';
    private readonly portalIframeSelector = 'iframe[title="portal-popup"]';

    constructor(page: Page) {
        super(page, '/');
    }

    async waitForPortalScript(): Promise<void> {
        await this.page.waitForSelector('script[data-ghost][data-key][data-api]', {
            state: 'attached',
            timeout: 10000
        });

        await this.page.waitForTimeout(500);
    }

    async openPortalViaSubscribeButton(): Promise<void> {
        await this.waitForPortalScript();

        const subscribeLink = this.page.locator('a[href="#/portal/signup"]').first();
        await subscribeLink.click();

        await this.page.waitForSelector(this.portalIframeSelector, {
            state: 'visible',
            timeout: 5000
        });
    }

    async openPortalViaSignInLink(): Promise<void> {
        await this.waitForPortalScript();

        const signinLink = this.page.locator('a[href="#/portal/signin"]').first();
        await signinLink.click();

        await this.page.waitForSelector(this.portalIframeSelector, {
            state: 'visible',
            timeout: 5000
        });
    }

    async waitForPortalToOpen(): Promise<void> {
        await this.page.waitForSelector(this.portalFrameSelector, {
            state: 'visible',
            timeout: 2000
        });
    }

    async isPortalOpen(): Promise<boolean> {
        const locator = this.page.locator(this.portalFrameSelector);
        const count = await locator.count();
        if (count === 0) {
            return false;
        }
        return await locator.isVisible();
    }
}
