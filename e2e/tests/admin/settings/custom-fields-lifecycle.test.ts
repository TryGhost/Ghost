import {SettingsPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

/**
 * The full definition lifecycle of a custom field, driven entirely through
 * Settings against a real backend: define -> rename -> archive -> reactivate ->
 * archive -> permanently delete. The acceptance tests cover each step against a
 * fake API; this pins the whole journey end to end, including the tab a field
 * moves between and its disappearance once deleted.
 *
 * The whole section is behind the membersCustomFields flag.
 */
usePerTestIsolation();

test.describe('Ghost Admin - Custom field lifecycle', () => {
    test.use({labs: {membersCustomFields: true}});

    test('a field can be defined, renamed, archived, reactivated and permanently deleted', async ({page}) => {
        const original = `Delivery address ${Date.now()}`;
        const renamed = `Shipping address ${Date.now()}`;

        const settingsPage = new SettingsPage(page);
        const customFields = settingsPage.customFieldsSection;

        await settingsPage.goto();

        // Define
        await customFields.createShortTextField(original);
        await expect(customFields.listItem(original)).toBeVisible();

        // Rename
        await customFields.renameField(original, renamed);
        await expect(customFields.listItem(renamed)).toBeVisible();

        // Archive: leaves the Active tab, appears under Archived
        await customFields.archiveField(renamed);
        await expect(customFields.listItem(renamed)).toHaveCount(0);
        await customFields.openTab('Archived');
        await expect(customFields.listItem(renamed)).toBeVisible();

        // Reactivate: leaves Archived, back under Active
        await customFields.reactivateField(renamed);
        await expect(customFields.listItem(renamed)).toHaveCount(0);
        await customFields.openTab('Active');
        await expect(customFields.listItem(renamed)).toBeVisible();

        // Archive again, then permanently delete from the Archived tab
        await customFields.archiveField(renamed);
        await customFields.openTab('Archived');
        await expect(customFields.listItem(renamed)).toBeVisible();

        await customFields.deleteField(renamed);
        await expect(customFields.listItem(renamed)).toHaveCount(0);
    });
});
