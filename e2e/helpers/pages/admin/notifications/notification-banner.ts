import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class NotificationBanner extends AdminPage {
    public readonly container: Locator;
    public readonly statusBanners: Locator;
    public readonly alertBanners: Locator;

    constructor(page: Page) {
        super(page);

        this.container = page.getByRole('region', {name: 'Notifications'});
        this.statusBanners = this.container.getByRole('status');
        this.alertBanners = this.container.getByRole('alert');
    }

    bannerById(id: string): Locator {
        return this.container.locator(`[data-test-notification-id="${id}"]`);
    }

    dismissButton(id: string): Locator {
        return this.bannerById(id).getByRole('button', {name: /dismiss/i});
    }

    async dismiss(id: string): Promise<void> {
        const button = this.dismissButton(id);
        await button.waitFor({state: 'visible'});
        await button.click();
    }
}
