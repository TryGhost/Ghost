import {SettingsPage} from '@/admin-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Portal Settings', () => {
    test('shows free tier toggle in the Portal settings modal when Stripe is disconnected', async ({page}) => {
        const settingsService = new SettingsService(page.request);
        await settingsService.setStripeDisconnected();

        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();
        await settingsPage.portalSection.openCustomizeModal();

        await expect(settingsPage.portalSection.freeTierToggleLabel).toBeVisible();
    });
});
