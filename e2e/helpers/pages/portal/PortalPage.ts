import {BasePage} from '../BasePage';
import {FrameLocator, Page} from '@playwright/test';

export class PortalPage extends BasePage {
    protected readonly portalFrame: FrameLocator;
    private readonly frameSelector = '[data-testid="portal-popup-frame"]';

    constructor(page: Page) {
        super(page);
        this.portalFrame = page.frameLocator(this.frameSelector);
    }

    async closePortal(waitForClose = true): Promise<void> {
        const closeButton = this.portalFrame.getByRole('button', {name: 'Close'});
        await closeButton.click();

        if (waitForClose) {
            await this.page.waitForSelector(this.frameSelector, {
                state: 'hidden',
                timeout: 2000
            });
        }
    }
}