import {BasePage, pageGotoOptions} from '../BasePage';
import {Locator, Page, Response} from '@playwright/test';

declare global {
    interface Window {
        __GHOST_SYNTHETIC_MONITORING__?: boolean;
    }
}

class PortalSection extends BasePage {
    public readonly portalRoot: Locator;
    private readonly portalFrame: Locator;
    private readonly portalIframe: Locator;
    private readonly portalScript: Locator;

    constructor(page: Page) {
        super(page, '/');

        this.portalRoot = page.getByTestId('portal-root');
        this.portalFrame = page.locator('[data-testid="portal-popup-frame"]');
        this.portalIframe = page.locator('iframe[title="portal-popup"]');
        this.portalScript = page.locator('script[data-ghost][data-key][data-api]');
    }

    async waitForScript(): Promise<void> {
        await this.portalScript.waitFor({
            state: 'attached',
            timeout: 10000
        });

        await this.page.waitForTimeout(500);
    }

    async waitForIFrame(): Promise<void> {
        await this.portalIframe.waitFor({
            state: 'visible',
            timeout: 5000
        });
    }

    async waitForPortalToOpen(): Promise<void> {
        await this.waitForIFrame();

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

export class PublicPage extends BasePage {
    public readonly portalRoot: Locator;
    private readonly subscribeLink: Locator;
    private readonly signInLink: Locator;

    private readonly portal: PortalSection;

    constructor(page: Page) {
        super(page, '/');

        this.portal = new PortalSection(page);
        this.portalRoot = this.portal.portalRoot;
        this.subscribeLink = page.locator('a[href="#/portal/signup"]').first();
        this.signInLink = page.locator('a[href="#/portal/signin"]').first();
    }

    linkWithPostName(name: string): Locator {
        return this.page.getByRole('link', {name: name});
    }

    // This is necessary because Ghost blocks analytics requests when in Playwright by default
    async enableAnalyticsRequests(): Promise<void> {
        await this.page.addInitScript(() => {
            window.__GHOST_SYNTHETIC_MONITORING__ = true;
        });
    }

    async goto(url?: string, options?: pageGotoOptions): Promise<void> {
        await this.enableAnalyticsRequests();
        const pageHitPromise = this.pageHitRequestPromise();
        await super.goto(url, options);
        await pageHitPromise;
    }

    pageHitRequestPromise(): Promise<Response> {
        return this.page.waitForResponse((response) => {
            return response.url().includes('/.ghost/analytics/api/v1/page_hit') && response.request().method() === 'POST';
        }, {timeout: 10000});
    }

    async waitForPageHitRequest(): Promise<void> {
        await this.pageHitRequestPromise();
    }

    async openPortalViaSubscribeButton(): Promise<void> {
        await this.portal.waitForScript();
        await this.subscribeLink.click();
        await this.portal.waitForPortalToOpen();
    }

    async openPortalViaSignInLink(): Promise<void> {
        await this.portal.waitForScript();
        await this.signInLink.click();
        await this.portal.waitForPortalToOpen();
    }
}
