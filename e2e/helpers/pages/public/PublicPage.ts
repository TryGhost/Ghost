import {Page, Locator} from '@playwright/test';
import {BasePage} from '../BasePage';

declare global {
    interface Window {
        __GHOST_SYNTHETIC_MONITORING__?: boolean;
    }
}

export class PublicPage extends BasePage{
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

    /**
     * Enables analytics requests by setting a variable on the window object.
     * This is necessary because Ghost blocks analytics requests when in Playwright by default.
    */
    async enableAnalyticsRequests(): Promise<void> {
        await this.page.addInitScript(() => {
            window.__GHOST_SYNTHETIC_MONITORING__ = true;
        });
    }

    /**
     * Overrides the goto method to enable analytics requests before navigating to the page.
    */
    async goto(url = null): Promise<void> {
        await this.enableAnalyticsRequests();
        await super.goto(url);
    }

    async waitForPageHitRequest(): Promise<void> {
        await this.page.waitForResponse((response) => {
            return response.url().includes('/.ghost/analytics/api/v1/page_hit') && response.request().method() === 'POST';
        }, {timeout: 10000});
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
