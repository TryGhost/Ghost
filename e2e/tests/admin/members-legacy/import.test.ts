import {join} from 'path';
import {tmpdir} from 'os';
import {writeFileSync} from 'fs';

import {MembersListPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Members Import', () => {
    test.use({labs: {membersForward: true}});

    test('imports members from CSV via the UI', async ({page}) => {
        const membersPage = new MembersListPage(page);

        const timestamp = Date.now();
        const emails = [
            `import-alice-${timestamp}@example.com`,
            `import-bob-${timestamp}@example.com`,
            `import-carol-${timestamp}@example.com`
        ];
        const csvContent = [
            'email,name,note',
            `${emails[0]},Alice Test,Note for Alice`,
            `${emails[1]},Bob Test,Note for Bob`,
            `${emails[2]},Carol Test,`
        ].join('\n');

        const csvPath = join(tmpdir(), `members-import-${timestamp}.csv`);
        writeFileSync(csvPath, csvContent);

        await membersPage.goto();
        await membersPage.openActionsMenu();
        await membersPage.getMenuItem('Import members').click();

        const importDialog = page.getByRole('dialog', {name: 'Import members'});
        const fileInput = importDialog.locator('input[type="file"]').first();
        const importButton = importDialog.getByRole('button', {name: /import \d+ members?/i});
        const importHeading = page.getByRole('heading', {name: /import (in progress|complete)/i});
        const closeButton = page.getByRole('button', {name: /got it|view members/i});
        const getMappingValue = (fieldName: string) => {
            return importDialog.getByRole('row', {
                name: new RegExp(`^${fieldName}\\b`, 'i')
            }).getByRole('combobox');
        };

        await fileInput.setInputFiles(csvPath);

        // Verify all three fields were auto-detected
        await expect(importButton).toBeVisible();
        await expect(getMappingValue('email')).toHaveText('Email');
        await expect(getMappingValue('name')).toHaveText('Name');
        await expect(getMappingValue('note')).toHaveText('Note');

        await importButton.click();

        await expect(importHeading).toBeVisible({timeout: 15000});

        // Close the modal and reload to see the imported members in the list
        await closeButton.click();

        await expect(page).toHaveURL(/\/members(\?.*)?$/);

        await expect(membersPage.getMemberByName('Alice Test')).toBeVisible({timeout: 30000});
        await expect(membersPage.getMemberByName('Bob Test')).toBeVisible();
        await expect(membersPage.getMemberByName('Carol Test')).toBeVisible();
    });
});
