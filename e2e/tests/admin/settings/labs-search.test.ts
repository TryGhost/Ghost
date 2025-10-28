import {test, expect} from '../../../helpers/playwright';
import {SettingsPage} from '../../../helpers/pages/admin';

test.describe('Ghost Admin - settings search - labs auto-open', () => {
    test('display only Labs component and auto-open when searching for "lab"', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();

        await expect(settingsPage.labsSection.section).toBeVisible();
        await expect(settingsPage.labsSection.openButton).toBeVisible();

        await settingsPage.searchInput.fill('lab');
        await page.waitForTimeout(300);

        await expect(settingsPage.labsSection.section).toBeVisible();
        await expect(settingsPage.labsSection.closeButton).toBeVisible();
    });
});
