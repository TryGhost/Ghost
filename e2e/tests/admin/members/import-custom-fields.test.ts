import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {writeFileSync} from 'node:fs';

import {MemberDetailsPage, MembersImportModal, MembersListPage, SettingsPage} from '@/admin-pages';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

/**
 * The custom-fields CSV round trip through the real admin UI: a value defined on a member,
 * exported, and imported back. The HTTP API tests cover the server behaviour; this pins the
 * two things only the browser exercises -- the export -> import loop end to end, and the
 * mapping step both auto-detecting an exported column and taking a hand-picked target.
 *
 * Behind membersCustomFields (the whole feature) and memberDetailsReact (the member detail
 * screen that renders a field's value).
 */
usePerTestIsolation();

test.describe('Ghost Admin - Members import with custom fields', () => {
    test.use({labs: {membersCustomFields: true, memberDetailsReact: true}});

    test('an exported custom field value round-trips back through import, auto-mapped', async ({page}) => {
        const ts = Date.now();
        const fieldName = `Loyalty tier ${ts}`;
        const sourceEmail = `rt-src-${ts}@ghost.org`;
        const sourceName = `RoundTrip Source ${ts}`;
        const freshEmail = `rt-fresh-${ts}@ghost.org`;
        const freshName = `RoundTrip Fresh ${ts}`;

        const memberFactory = createMemberFactory(page.request);
        const member = await memberFactory.create({name: sourceName, email: sourceEmail});

        const settingsPage = new SettingsPage(page);
        const memberDetailsPage = new MemberDetailsPage(page);
        const membersPage = new MembersListPage(page);
        const importModal = new MembersImportModal(page);

        await settingsPage.goto();
        await settingsPage.customFieldsSection.createShortTextField(fieldName);

        await page.goto(`/ghost/#/members/${member.id}`);
        await memberDetailsPage.setCustomFieldValue(fieldName, 'Gold');
        await expect(memberDetailsPage.customFieldsCard.getByText('Gold')).toBeVisible();

        await membersPage.goto();
        await membersPage.openActionsMenu();
        const {content} = await membersPage.exportMembers();

        const customColumn = content.match(/custom_fields\.[a-z0-9_-]+/)?.[0];
        expect(customColumn, 'export carries a custom field column').toBeTruthy();
        expect(content).toContain('Gold');

        // Re-import under a fresh identity, so the member is created from the CSV and the
        // value can only come from the import, not the setup above.
        const csvPath = join(tmpdir(), `members-rt-${ts}.csv`);
        writeFileSync(csvPath, content.replace(sourceEmail, freshEmail).replace(sourceName, freshName));

        // The list now has a member, so import lives in the Actions menu (not the
        // empty-state link).
        await membersPage.goto();
        await membersPage.openImport();
        await importModal.fileInput.setInputFiles(csvPath);

        await expect(importModal.importButton).toBeVisible();
        // Default mapping: the exported column auto-detects to its field, no manual step.
        await expect(importModal.getMappingValue(customColumn as string)).toHaveText(fieldName);

        await importModal.importButton.click();
        await expect(importModal.importHeading).toBeVisible({timeout: 15000});
        await importModal.closeButton.click();

        await membersPage.goto();
        await membersPage.searchInput.fill(freshEmail);
        await expect(membersPage.getMemberByName(freshName)).toBeVisible({timeout: 30000});
        await membersPage.openMemberByName(freshName);

        await expect(memberDetailsPage.customFieldsCard.getByText('Gold')).toBeVisible();
    });

    test('a column is mapped to a custom field by hand and its value is imported', async ({page}) => {
        const ts = Date.now();
        const fieldName = `Occupation ${ts}`;
        const email = `cm-${ts}@ghost.org`;
        const name = `Custom Mapping ${ts}`;

        const settingsPage = new SettingsPage(page);
        const memberDetailsPage = new MemberDetailsPage(page);
        const membersPage = new MembersListPage(page);
        const importModal = new MembersImportModal(page);

        await settingsPage.goto();
        await settingsPage.customFieldsSection.createShortTextField(fieldName);

        // A header the importer will not auto-detect, so the mapping is done by hand.
        const csv = ['email,name,Their Job', `${email},${name},Engineer`].join('\n');
        const csvPath = join(tmpdir(), `members-cm-${ts}.csv`);
        writeFileSync(csvPath, csv);

        await membersPage.goto();
        await membersPage.importCsvLink.click();
        await importModal.fileInput.setInputFiles(csvPath);
        await expect(importModal.importButton).toBeVisible();

        await expect(importModal.getMappingValue('Their Job')).toHaveText('Not imported');
        await importModal.setMappingTarget('Their Job', fieldName);
        await expect(importModal.getMappingValue('Their Job')).toHaveText(fieldName);

        await importModal.importButton.click();
        await expect(importModal.importHeading).toBeVisible({timeout: 15000});
        await importModal.closeButton.click();

        await membersPage.goto();
        await membersPage.searchInput.fill(email);
        await expect(membersPage.getMemberByName(name)).toBeVisible({timeout: 30000});
        await membersPage.openMemberByName(name);

        await expect(memberDetailsPage.customFieldsCard.getByText('Engineer')).toBeVisible();
    });
});
