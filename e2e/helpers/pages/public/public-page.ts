import {BasePage, pageGotoOptions} from '@/helpers/pages';
import {Locator, Page, Response, test} from '@playwright/test';
import {expect} from '@/helpers/playwright';

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

    /**
     * Click a Portal link and wait for the popup to open, with retries.
     *
     * Portal's hashchange listener is only set up after its async init completes.
     * If clicked before init finishes, the popup won't open. This method uses
     * Playwright's retry mechanism to handle the race condition deterministically.
     */
    async clickLinkAndWaitForPopup(link: Locator): Promise<void> {
        await this.portalScript.waitFor({state: 'attached'});
        await this.portalRoot.waitFor({state: 'attached'});

        // Use expect.toPass to retry click + popup check until Portal is ready
        await expect(async () => {
            await link.click();
            await expect(this.portalIframe).toBeVisible();
        }).toPass();
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

    protected readonly portal: PortalSection;

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

    async goto(url?: string, options?: pageGotoOptions): Promise<null | Response> {
        const testInfo = test.info();
        let pageHitPromise = null;
        if (testInfo.project.name === 'analytics') {
            await this.enableAnalyticsRequests();
            pageHitPromise = this.pageHitRequestPromise();
        }
        const result = await super.goto(url, options);
        if (pageHitPromise) {
            await pageHitPromise;
        }
        return result;
    }

    pageHitRequestPromise(): Promise<Response> {
        return this.page.waitForResponse((response) => {
            return response
                .url()
                .includes('/.ghost/analytics/api/v1/page_hit') && response.request().method() === 'POST';
        });
    }

    protected async waitForMemberAttributionReady(): Promise<void> {
        // TODO: Ideally we should find a way to get rid of this. This is currently needed
        // to prevent flaky attribution-dependent assertions in CI.
        await this.page.waitForFunction(() => {
            try {
                const raw = window.sessionStorage.getItem('ghost-history');

                if (!raw) {
                    return false;
                }

                const history = JSON.parse(raw);
                return Array.isArray(history) && history.length > 0;
            } catch {
                return false;
            }
        });
    }

    async openPortalViaSubscribeButton(): Promise<void> {
        await this.waitForMemberAttributionReady();
        await this.portal.clickLinkAndWaitForPopup(this.subscribeLink);
    }

    async openPortalViaSignInLink(): Promise<void> {
        await this.waitForMemberAttributionReady();
        await this.portal.clickLinkAndWaitForPopup(this.signInLink);
    }
}
