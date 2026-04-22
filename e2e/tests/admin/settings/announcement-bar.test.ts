import {AnnouncementBarSection, SettingsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Announcement Bar', () => {
    test('bar is hidden by default', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();

        const announcementBar = new AnnouncementBarSection(page);
        await announcementBar.openModal();

        await expect(announcementBar.announcementBarRoot).toHaveCount(0);
    });

    test('bar visibility toggles with free members checkbox', async ({page}) => {
        const settingsPage = new SettingsPage(page);
        await settingsPage.goto();

        const announcementBar = new AnnouncementBarSection(page);
        await announcementBar.openModal();

        await announcementBar.freeMembersCheckbox.check();
        await announcementBar.typeAnnouncementText('Announcement text');

        await expect(announcementBar.announcementBarRoot).toContainText('Announcement text');

        await announcementBar.freeMembersCheckbox.uncheck();
        await announcementBar.editor.click();

        await expect(announcementBar.announcementBarRoot).toHaveCount(0);
    });
});
