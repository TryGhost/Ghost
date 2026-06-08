import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {writeFileSync} from 'node:fs';

import {MembersImportModal, MembersListPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Members Import', () => {
    test('imports members from CSV via the UI', async ({page}) => {
        const membersPage = new MembersListPage(page);
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
        await membersPage.openActionsMenu();
        await membersPage.getMenuItem(/Import members/).click();

        await importModal.fileInput.setInputFiles(csvPath);

        await expect(importModal.importButton).toBeVisible();
        await expect(importModal.getMappingValue('email')).toHaveText('Email');
        await expect(importModal.getMappingValue('name')).toHaveText('Name');
        await expect(importModal.getMappingValue('note')).toHaveText('Note');

        await importModal.importButton.click();

        await expect(importModal.importHeading).toBeVisible({timeout: 15000});

        await importModal.closeButton.click();
        await membersPage.goto();

        await expect(membersPage.getMemberByName('Alice Test')).toBeVisible({timeout: 30000});
        await expect(membersPage.getMemberByName('Bob Test')).toBeVisible();
        await expect(membersPage.getMemberByName('Carol Test')).toBeVisible();
    });

    test('opens import modal on direct URL navigation without errors', async ({page}) => {
        await page.goto('/ghost/#/members/import');

        await expect(page.getByRole('dialog', {name: 'Import members'})).toBeVisible();

        // Regression guard: the bug surfaced as an Ember alert like
        // "Validation (matches) failed for id undefined.id" via #ember-alerts-wormhole
        await expect(page.getByText(/Validation.*failed for id/i)).toHaveCount(0);
    });
});
