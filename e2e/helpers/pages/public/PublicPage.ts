import {Page, Locator} from '@playwright/test';
import {BasePage} from '../BasePage';

export default class PublicPage extends BasePage{
    private readonly portalFrame: Locator;
    private readonly portalIframe: Locator;
    private readonly portalScript: Locator;
    private readonly subscribeLink: Locator;
    private readonly signInLink: Locator;

    constructor(page: Page) {
        super(page, '/');

        this.portalFrame = page.locator('[data-testid="portal-popup-frame"]');
        this.portalIframe = page.locator('iframe[title="portal-popup"]');
        this.portalScript = page.locator('script[data-ghost][data-key][data-api]');
        this.subscribeLink = page.locator('a[href="#/portal/signup"]').first();
        this.signInLink = page.locator('a[href="#/portal/signin"]').first();
    }

    async waitForPortalScript(): Promise<void> {
        await this.portalScript.waitFor({
            state: 'attached',
            timeout: 10000
        });

        await this.page.waitForTimeout(500);
    }

    async openPortalViaSubscribeButton(): Promise<void> {
        await this.waitForPortalScript();
        await this.subscribeLink.click();
        await this.portalIframe.waitFor({
            state: 'visible',
            timeout: 5000
        });
    }

    async openPortalViaSignInLink(): Promise<void> {
        await this.waitForPortalScript();
        await this.signInLink.click();
        await this.portalIframe.waitFor({
            state: 'visible',
            timeout: 5000
        });
    }

    async waitForPortalToOpen(): Promise<void> {
        await this.portalFrame.waitFor({
            state: 'visible',
            timeout: 2000
        });
    }

    async isPortalOpen(): Promise<boolean> {
        const count = await this.portalFrame.count();
        if (count === 0) {
            return false;
        }
        return await this.portalFrame.isVisible();
    }
}
