import {join} from 'path';
import {tmpdir} from 'os';
import {writeFileSync} from 'fs';

import {MembersImportModal, MembersPage} from '@/helpers/pages';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Members Import', () => {
    test.use({labs: {membersForward: false}});

    test('imports members from CSV via the UI', async ({page}) => {
        const importPage = new MembersPage(page, {route: 'members/import'});
        const membersPage = new MembersPage(page);
        const importModal = new MembersImportModal(page);

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

        await importPage.goto();

        await importModal.fileInput.setInputFiles(csvPath);

        // Verify all three fields were auto-detected
        await expect(importModal.importButton).toBeVisible();
        await expect(importModal.getMappingValue('email')).toHaveValue('email');
        await expect(importModal.getMappingValue('name')).toHaveValue('name');
        await expect(importModal.getMappingValue('note')).toHaveValue('note');

        await importModal.importButton.click();

        await expect(importModal.importHeading).toBeVisible({timeout: 15000});

        // Close the modal and reload to see the imported members in the list
        await importModal.closeButton.click();

        await expect(page).toHaveURL(/#\/members\?filter=label%3A%5Bimport-/);

        await expect(membersPage.getMemberByName('Alice Test')).toBeVisible({timeout: 30000});
        await expect(membersPage.getMemberByName('Bob Test')).toBeVisible();
        await expect(membersPage.getMemberByName('Carol Test')).toBeVisible();
    });
});
