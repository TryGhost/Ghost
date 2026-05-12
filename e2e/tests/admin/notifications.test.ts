import {NotificationBanner} from '@/admin-pages';
import {Page} from '@playwright/test';
import {expect, test} from '@/helpers/playwright/fixture';

type MockNotification = {
    id: string;
    message: string;
    type?: 'info' | 'warn' | 'error';
    status?: 'alert' | 'notification';
    dismissible?: boolean;
    top?: boolean;
    custom?: boolean;
};

async function mockNotifications(page: Page, notifications: MockNotification[]): Promise<void> {
    const dismissed = new Set<string>();

    await page.route('**/ghost/api/admin/notifications/', async (route) => {
        const remaining = notifications.filter(n => !dismissed.has(n.id));
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({notifications: remaining})
        });
    });

    await page.route('**/ghost/api/admin/notifications/*/', async (route) => {
        if (route.request().method() !== 'DELETE') {
            await route.continue();
            return;
        }
        const url = new URL(route.request().url());
        const segments = url.pathname.split('/').filter(Boolean);
        const id = segments[segments.length - 1];
        dismissed.add(id);
        await route.fulfill({status: 204, body: ''});
    });
}

test.describe('Ghost Admin - Notification Banner', () => {
    test('renders an informational notification with status role', async ({page}) => {
        await mockNotifications(page, [{
            id: 'info-1',
            message: 'Heads up: scheduled maintenance tonight.',
            type: 'info',
            status: 'notification',
            top: true,
            dismissible: true
        }]);

        const banner = new NotificationBanner(page);
        await banner.goto();

        await expect(banner.bannerById('info-1')).toBeVisible();
        await expect(banner.statusBanners).toHaveCount(1);
        await expect(banner.bannerById('info-1')).toContainText('Heads up: scheduled maintenance tonight.');
    });

    test('renders an urgent alert notification with alert role', async ({page}) => {
        await mockNotifications(page, [{
            id: 'alert-1',
            message: 'A critical security update is available.',
            status: 'alert',
            type: 'warn',
            top: true,
            dismissible: true
        }]);

        const banner = new NotificationBanner(page);
        await banner.goto();

        await expect(banner.bannerById('alert-1')).toBeVisible();
        await expect(banner.alertBanners).toHaveCount(1);
        await expect(banner.bannerById('alert-1')).toContainText('A critical security update is available.');
    });

    test('dismisses a notification and stays dismissed across reload', async ({page}) => {
        await mockNotifications(page, [{
            id: 'dismiss-1',
            message: 'Goodbye notification',
            type: 'info',
            top: true,
            dismissible: true
        }]);

        const banner = new NotificationBanner(page);
        await banner.goto();

        await expect(banner.bannerById('dismiss-1')).toBeVisible();

        await banner.dismiss('dismiss-1');

        await expect(banner.bannerById('dismiss-1')).toBeHidden();

        await page.reload();

        await expect(banner.bannerById('dismiss-1')).toBeHidden();
    });

    test('does not render a dismiss control for non-dismissible notifications', async ({page}) => {
        await mockNotifications(page, [{
            id: 'sticky-1',
            message: 'You cannot dismiss this notice.',
            status: 'alert',
            type: 'error',
            top: true,
            dismissible: false
        }]);

        const banner = new NotificationBanner(page);
        await banner.goto();

        await expect(banner.bannerById('sticky-1')).toBeVisible();
        await expect(banner.dismissButton('sticky-1')).toHaveCount(0);
    });
});
