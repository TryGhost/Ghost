import {BasePage} from '../BasePage';
import {Page, FrameLocator} from '@playwright/test';

export class PortalPage extends BasePage {
    protected readonly portalFrame: FrameLocator;
    private readonly frameSelector = '[data-testid="portal-popup-frame"]';

    constructor(page: Page) {
        super(page);
        this.portalFrame = page.frameLocator(this.frameSelector);
    }

    /**
        Wait for the Portal iframe to appear.
        Only needed if you want to explicitly wait for Portal to open.
        
        FrameLocator methods automatically wait, so this is only useful when:
        1. You need to ensure Portal is open before non-frame operations
        2. You want to fail fast if Portal doesn't open
     */
    async waitForPortalToOpen(): Promise<void> {
        await this.page.waitForSelector(this.frameSelector, {
            state: 'visible',
            timeout: 2000
        });
    }

    async isPortalClosed(): Promise<boolean> {
        const locator = this.page.locator(this.frameSelector);
        const count = await locator.count();
        if (count === 0) {
            return true;
        }
        return !(await locator.isVisible());
    }

    async closePortal(waitForClose = true): Promise<void> {
        const closeButton = this.portalFrame.getByRole('button', {name: 'Close'});
        await closeButton.click();

        if (waitForClose) {
            // Wait for Portal to actually disappear after clicking close
            // This ensures the close animation completes and prevents race conditions
            await this.page.waitForSelector(this.frameSelector, {
                state: 'hidden',
                timeout: 2000
            });
        }
    }
}