import {BasePage} from '@/helpers/pages';
import {FrameLocator, Locator, Page} from '@playwright/test';

export class SupportNotificationPage extends BasePage {
    readonly notificationFrame: FrameLocator;
    readonly successMessage: Locator;

    constructor(page: Page) {
        super(page);

        this.notificationFrame = page.frameLocator('[data-testid="portal-notification-frame"]');
        this.successMessage = this.notificationFrame.getByText('Thank you for your support!');
    }
}
