import {BasePage} from '../BasePage';
import {FrameLocator, Locator, Page} from '@playwright/test';

export class PortalPage extends BasePage {
    readonly portalFrame: FrameLocator;
    private readonly frameSelector = '[data-testid="portal-popup-frame"]';
    readonly closeButton: Locator;
    readonly body: Locator;

    constructor(page: Page) {
        super(page);
        this.portalFrame = page.frameLocator(this.frameSelector);

        this.closeButton = this.portalFrame.getByRole('button', {name: 'Close'});
        this.body = this.portalFrame.locator('body');
    }

    async closePortal(): Promise<void> {
        await this.closeButton.click();
        await this.page.waitForSelector(this.frameSelector, {state: 'hidden', timeout: 2000});
    }
}
