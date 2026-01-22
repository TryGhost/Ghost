import {IntegrationModal} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

interface Setting {
    key: string;
    value: string | boolean | null;
}

interface SettingsResponse {
    settings: Setting[];
}

test.describe('Ghost Admin - Integrations', () => {
    test.describe('Transistor Integration', () => {
        test.describe('with transistor labs flag enabled', () => {
            test.use({labs: {transistor: true}});

            test('transistor integration is visible when labs flag is enabled', async ({page}) => {
                const transistor = new IntegrationModal(page, 'transistor');

                await transistor.goto();

                await expect(transistor.integrationItem).toBeVisible();
            });

            test('can open transistor modal', async ({page}) => {
                const transistor = new IntegrationModal(page, 'transistor');

                await transistor.goto();
                await transistor.openModal();

                await expect(transistor.modal).toBeVisible();
                await expect(transistor.enableToggle).toBeVisible();
            });

            test('can enable transistor integration', async ({page}) => {
                const transistor = new IntegrationModal(page, 'transistor');

                await transistor.goto();
                await transistor.openModal();
                await transistor.enable();
                await transistor.save();

                const response = await page.request.get('/ghost/api/admin/settings/');
                expect(response.ok()).toBe(true);

                const data = await response.json() as SettingsResponse;
                const transistorSetting = data.settings.find(s => s.key === 'transistor');
                expect(transistorSetting).toBeDefined();
                expect(transistorSetting?.value).toBe(true);
            });

            test('can disable transistor integration', async ({page}) => {
                const transistor = new IntegrationModal(page, 'transistor');

                await transistor.goto();
                await transistor.openModal();
                await transistor.enable();
                await transistor.save();

                await transistor.closeModal();
                await transistor.openModal();
                await transistor.disable();
                await transistor.save();

                const response = await page.request.get('/ghost/api/admin/settings/');
                expect(response.ok()).toBe(true);

                const data = await response.json() as SettingsResponse;
                const transistorSetting = data.settings.find(s => s.key === 'transistor');
                expect(transistorSetting).toBeDefined();
                expect(transistorSetting?.value).toBe(false);
            });

            test('transistor enabled state persists after page reload', async ({page}) => {
                const transistor = new IntegrationModal(page, 'transistor');

                await transistor.goto();
                await transistor.openModal();
                await transistor.enable();
                await transistor.save();
                await transistor.closeModal();

                await page.reload();
                await transistor.integrationsSection.waitFor({state: 'visible'});

                await transistor.openModal();

                await expect(transistor.enableToggle).toHaveAttribute('aria-checked', 'true');
            });

            test('transistor shows active badge when enabled', async ({page}) => {
                const transistor = new IntegrationModal(page, 'transistor');

                await transistor.goto();
                await transistor.openModal();
                await transistor.enable();
                await transistor.save();
                await transistor.closeModal();

                await expect(transistor.integrationItem.getByText('Active')).toBeVisible();
            });
        });

        test.describe('with transistor labs flag disabled', () => {
            test.use({labs: {transistor: false}});

            test('transistor integration is hidden when labs flag is disabled', async ({page}) => {
                const transistor = new IntegrationModal(page, 'transistor');

                await transistor.goto();

                await expect(transistor.integrationItem).toBeHidden();
            });
        });
    });

    test.describe('Unsplash Integration', () => {
        test('can enable unsplash integration', async ({page}) => {
            const unsplash = new IntegrationModal(page, 'unsplash');

            await unsplash.goto();
            await unsplash.openModal();
            await unsplash.enable();
            await unsplash.save();

            const response = await page.request.get('/ghost/api/admin/settings/');
            expect(response.ok()).toBe(true);

            const data = await response.json() as SettingsResponse;
            const unsplashSetting = data.settings.find(s => s.key === 'unsplash');
            expect(unsplashSetting).toBeDefined();
            expect(unsplashSetting?.value).toBe(true);
        });

        test('can disable unsplash integration', async ({page}) => {
            const unsplash = new IntegrationModal(page, 'unsplash');

            await unsplash.goto();
            await unsplash.openModal();
            await unsplash.disable();
            await unsplash.save();

            const response = await page.request.get('/ghost/api/admin/settings/');
            expect(response.ok()).toBe(true);

            const data = await response.json() as SettingsResponse;
            const unsplashSetting = data.settings.find(s => s.key === 'unsplash');
            expect(unsplashSetting).toBeDefined();
            expect(unsplashSetting?.value).toBe(false);
        });
    });

    test.describe('Pintura Integration', () => {
        test('can enable pintura integration', async ({page}) => {
            const pintura = new IntegrationModal(page, 'pintura');

            await pintura.goto();
            await pintura.openModal();
            await pintura.enable();
            await pintura.save();

            const response = await page.request.get('/ghost/api/admin/settings/');
            expect(response.ok()).toBe(true);

            const data = await response.json() as SettingsResponse;
            const pinturaSetting = data.settings.find(s => s.key === 'pintura');
            expect(pinturaSetting).toBeDefined();
            expect(pinturaSetting?.value).toBe(true);
        });

        test('can disable pintura integration', async ({page}) => {
            const pintura = new IntegrationModal(page, 'pintura');

            await pintura.goto();
            await pintura.openModal();
            await pintura.disable();
            await pintura.save();

            const response = await page.request.get('/ghost/api/admin/settings/');
            expect(response.ok()).toBe(true);

            const data = await response.json() as SettingsResponse;
            const pinturaSetting = data.settings.find(s => s.key === 'pintura');
            expect(pinturaSetting).toBeDefined();
            expect(pinturaSetting?.value).toBe(false);
        });
    });
});
