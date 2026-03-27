import {HomePage, PrivateSitePage} from '@/helpers/pages';
import {PrivateSiteSection, SettingsPage} from '@/admin-pages';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Private Site', () => {
    test('private site requires password and can be made public again', async ({page, browser, baseURL}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();

        const privateSiteSettings = new PrivateSiteSection(page);
        await privateSiteSettings.enablePrivateMode('password');
        await expect(privateSiteSettings.passwordInput).toHaveCount(0);

        await withIsolatedPage(browser, {baseURL}, async ({page: frontendPage}) => {
            const privateSite = new PrivateSitePage(frontendPage);
            await privateSite.goto();

            await expect(frontendPage).toHaveURL(/\/private\/\?r=%2F/);
            await expect(privateSite.accessCodeLink).toBeVisible();

            await privateSite.openAccessCodeDialog();
            await expect(privateSite.accessCodeDialog).toBeVisible();
            await expect(privateSite.enterButton).toBeVisible();
        });

        await privateSiteSettings.disablePrivateMode();
        await expect(privateSiteSettings.passwordInput).toHaveCount(0);

        await withIsolatedPage(browser, {baseURL}, async ({page: frontendPage}) => {
            const site = new HomePage(frontendPage);
            await expect(async () => {
                await site.goto();
                await expect(site.title).toBeVisible();
            }).toPass();
        });
    });
});
