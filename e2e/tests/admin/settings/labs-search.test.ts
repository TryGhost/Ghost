import {test, expect} from '../../../helpers/playwright';
import {SettingsPage} from '../../../helpers/pages/admin/settings/SettingsPage';

test.describe('Settings Search - Labs Auto-open', () => {
    test('should display only Labs component and auto-open when searching for "lab"', async ({page, ghostInstance}) => {
        // Navigate directly to settings page
        await page.goto(`${ghostInstance.baseUrl}/ghost/#/settings`);

        // Wait for settings page to load completely
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('h5', {timeout: 10000});

        // Create settings page object
        const settingsPage = new SettingsPage(page);

        // Verify Labs section is visible initially
        await expect(settingsPage.labsSection).toBeVisible();

        // Verify Labs is initially closed (Open button should be visible)
        await expect(settingsPage.labsOpenButton).toBeVisible();

        // Search for "lab"
        await settingsPage.searchInput.fill('lab');

        // Wait for filtering and auto-open to occur
        await page.waitForTimeout(300);

        // Verify Labs section is still visible
        await expect(settingsPage.labsSection).toBeVisible();

        // Verify Labs auto-opened (Close button should now be visible)
        await expect(settingsPage.labsCloseButton).toBeVisible();
    });
});