import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersListPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Members Bulk Actions', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('adds a label to filtered members via bulk action', async ({page}) => {
        await memberFactory.createMany([
            {name: 'Bulk Label 1', email: 'bulk1@example.com', labels: ['existing']},
            {name: 'Bulk Label 2', email: 'bulk2@example.com', labels: ['existing']},
            {name: 'Bulk Label 3', email: 'bulk3@example.com'}
        ]);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await membersPage.addFilter('Label', 'existing');
        await expect(membersPage.memberRows).toHaveCount(2);

        await membersPage.openActionsMenu();
        await membersPage.getMenuItem(/Add label/).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        // Type in the label picker to find and select a label
        await dialog.getByRole('combobox').click();
        await dialog.getByPlaceholder('Search labels...').fill('existing');
        await dialog.getByText('existing', {exact: true}).first().click();

        // Close the dropdown by clicking the dialog heading (outside the picker)
        await dialog.getByRole('heading').click();
        await dialog.getByRole('button', {name: 'Add label'}).click();
        await expect(dialog).toBeHidden();
    });

    test('removes a label from filtered members via bulk action', async ({page}) => {
        await memberFactory.createMany([
            {name: 'Has Label', email: 'haslabel1@example.com', labels: ['removable']},
            {name: 'Has Label Too', email: 'haslabel2@example.com', labels: ['removable']},
            {name: 'No Label', email: 'nolabel@example.com'}
        ]);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();

        await membersPage.addFilter('Label', 'removable');
        await expect(membersPage.memberRows).toHaveCount(2);

        await membersPage.openActionsMenu();
        await membersPage.getMenuItem(/Remove label/).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();

        // Select the label to remove then close the dropdown by clicking the heading
        await dialog.getByRole('combobox').click();
        await dialog.getByText('removable', {exact: true}).first().click();
        await dialog.getByRole('heading').click();

        await dialog.getByRole('button', {name: 'Remove label'}).click();
        await expect(dialog).toBeHidden();
    });

    test('unsubscribes all members from newsletters', async ({page}) => {
        await memberFactory.createMany([
            {name: 'Sub Member 1', email: 'sub1@example.com'},
            {name: 'Sub Member 2', email: 'sub2@example.com'}
        ]);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await expect(membersPage.memberRows).toHaveCount(2);

        await membersPage.openActionsMenu();
        await membersPage.getMenuItem(/Unsubscribe/).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText('Unsubscribe members')).toBeVisible();

        await dialog.getByRole('button', {name: 'Unsubscribe'}).click();
        await expect(dialog).toBeHidden();
    });

    test('deletes members with backup download', async ({page}) => {
        await memberFactory.createMany([
            {name: 'Delete Me 1', email: 'delete1@example.com'},
            {name: 'Delete Me 2', email: 'delete2@example.com'}
        ]);

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await expect(membersPage.memberRows).toHaveCount(2);

        await membersPage.openActionsMenu();
        await membersPage.getMenuItem(/Delete/).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText('Delete selected members?')).toBeVisible();
        await expect(dialog.getByText(/2 members/)).toBeVisible();

        // Confirm triggers backup download then deletion
        const downloadPromise = page.waitForEvent('download');
        await dialog.getByRole('button', {name: 'Download backup & delete members'}).click();
        await downloadPromise;

        await expect(dialog).toBeHidden();
        await expect(membersPage.emptyState).toBeVisible();
    });
});
