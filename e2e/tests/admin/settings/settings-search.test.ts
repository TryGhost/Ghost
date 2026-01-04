import {SettingsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - settings search sidebar', () => {
    test('displays all section when not searching', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();

        await expect(settingsPage.labsSection.section).toBeVisible();
        await expect(settingsPage.labsSection.openButton).toBeVisible();
    });

    test('displays only searched section', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();
        
        await settingsPage.searchByInput('lab');
        await expect(settingsPage.labsSidebarLink).toBeVisible();
        await expect(settingsPage.labsSection.section).toBeVisible();
        await expect(settingsPage.labsSection.closeButton).toBeVisible();

        await settingsPage.searchByInput('staff');
        await expect(settingsPage.staffSidebarLink).toBeVisible();
        await expect(settingsPage.labsSection.section).toBeHidden();
    });

    test('displays all searched sections when no sections found', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();

        await settingsPage.searchByInput('returnNoResultsInSearch');
        await expect(settingsPage.labsSidebarLink).toBeHidden();
        await expect(settingsPage.labsSection.section).toBeVisible();
    });
});
