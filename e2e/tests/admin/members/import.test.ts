import {join} from 'path';
import {tmpdir} from 'os';
import {writeFileSync} from 'fs';

import {MembersImportModal, MembersPage} from '@/helpers/pages';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Members Import', () => {
    test('imports members from CSV via the UI', async ({page}) => {
        const membersPage = new MembersPage(page, {route: 'members-forward'});
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

        await membersPage.goto();
        await membersPage.membersActionsButton.click();
        await page.getByRole('menuitem', {name: 'Import members'}).click();

        await importModal.fileInput.setInputFiles(csvPath);

        // Verify all three fields were auto-detected
        await expect(importModal.importButton).toBeVisible();
        await expect(importModal.getMappingValue('email')).toHaveText('Email');
        await expect(importModal.getMappingValue('name')).toHaveText('Name');
        await expect(importModal.getMappingValue('note')).toHaveText('Note');

        await importModal.importButton.click();

        await expect(importModal.importHeading).toBeVisible({timeout: 15000});

        // Close the modal and reload to see the imported members in the list
        await importModal.closeButton.click();
        await membersPage.goto();

        await expect(membersPage.getMemberByName('Alice Test')).toBeVisible({timeout: 30000});
        await expect(membersPage.getMemberByName('Bob Test')).toBeVisible();
        await expect(membersPage.getMemberByName('Carol Test')).toBeVisible();
    });
});
