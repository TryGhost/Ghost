// Vendored from /e2e/tests/admin/settings/access.test.ts. withIsolatedPage
// is inlined: a fresh context without the owner's storage state.
import type {Browser} from '@playwright/test';
import {AccessSection, PrivateSitePage, SettingsPage} from '../../../helpers/settings-pages';
import {HomePage} from '../../../helpers/pages';
import {expect, test} from '../../../helpers/fixture';

async function withIsolatedPage(
    browser: Browser,
    options: {baseURL?: string},
    callback: (args: {page: import('@playwright/test').Page}) => Promise<void>
): Promise<void> {
    const context = await browser.newContext({baseURL: options.baseURL ?? undefined, storageState: {cookies: [], origins: []}});
    try {
        await callback({page: await context.newPage()});
    } finally {
        await context.close();
    }
}

test.describe('Ghost Admin - Access', () => {
    test('private site requires password and can be made public again', async ({page, browser, baseURL}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();

        const accessSettings = new AccessSection(page);
        await accessSettings.enablePrivateMode('password');

        await withIsolatedPage(browser, {baseURL}, async ({page: frontendPage}) => {
            const privateSite = new PrivateSitePage(frontendPage);
            await privateSite.goto();

            await expect(frontendPage).toHaveURL(/\/private\/\?r=%2F/);
            await expect(privateSite.accessCodeLink).toBeVisible();

            await privateSite.openAccessCodeDialog();
            await expect(privateSite.accessCodeDialog).toBeVisible();
            await expect(privateSite.enterButton).toBeVisible();
        });

        await accessSettings.disablePrivateMode();
        await expect(accessSettings.passwordInput).toHaveCount(0);

        await withIsolatedPage(browser, {baseURL}, async ({page: frontendPage}) => {
            const site = new HomePage(frontendPage);
            await expect(async () => {
                await site.goto();
                await expect(site.title).toBeVisible();
            }).toPass();
        });
    });
});
