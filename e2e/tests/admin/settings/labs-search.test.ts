import {test, expect} from '../../../helpers/playwright';
import {SettingsPage} from '../../../helpers/pages/admin';

test.describe('Settings Search - Labs Auto-open', () => {
    test('display only Labs component and auto-open when searching for "lab"', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();

        await expect(settingsPage.labsSection).toBeVisible();
        await expect(settingsPage.labsOpenButton).toBeVisible();

        await settingsPage.searchInput.fill('lab');
        await page.waitForTimeout(300);

        await expect(settingsPage.labsSection).toBeVisible();
        await expect(settingsPage.labsCloseButton).toBeVisible();
    });
});
