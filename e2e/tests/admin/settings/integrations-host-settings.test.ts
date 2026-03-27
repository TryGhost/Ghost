import {SettingsPage} from '@/admin-pages';
import {SettingsResponse, SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Integration Host Settings', () => {
    test.use({
        config: {
            hostSettings__limits__customIntegrations__disabled: 'true',
            hostSettings__limits__customIntegrations__error: 'Custom limit error message'
        },
        labs: {
            transistor: true
        }
    });

    test('Zapier shows upgrade when custom integrations are limited', async ({page}) => {
        const settingsPage = new SettingsPage(page);

        await settingsPage.integrationsSection.goto();

        const zapierIntegration = page.getByTestId('zapier-integration');

        await expect(zapierIntegration).toBeVisible();
        await expect(zapierIntegration.getByRole('button', {name: 'Upgrade'})).toBeVisible();
        await expect(zapierIntegration.getByRole('button', {name: 'Configure'})).toHaveCount(0);
    });

    test('Transistor shows upgrade when custom integrations are limited', async ({page}) => {
        const settingsPage = new SettingsPage(page);

        await settingsPage.integrationsSection.goto();

        const transistorIntegration = page.getByTestId('transistor-integration');

        await expect(transistorIntegration).toBeVisible();
        await expect(transistorIntegration.getByRole('button', {name: 'Upgrade'})).toBeVisible();
        await expect(transistorIntegration.getByRole('button', {name: 'Configure'})).toHaveCount(0);
    });

    test('Transistor reads as disabled in admin settings when custom integrations are limited', async ({page}) => {
        const settingsService = new SettingsService(page.request);

        await settingsService.updateSettings([{key: 'transistor', value: true}]);

        const response = await page.request.get('/ghost/api/admin/settings/');
        expect(response.ok()).toBe(true);

        const data = await response.json() as SettingsResponse;
        const transistorSetting = data.settings.find(s => s.key === 'transistor');

        expect(transistorSetting).toBeDefined();
        expect(transistorSetting?.value).toBe(false);
    });
});
