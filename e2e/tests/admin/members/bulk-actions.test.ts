import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersListPage} from '@/admin-pages';
import {MembersService} from '@/helpers/services/members';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Members Bulk Actions', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        await new MembersService(page.request).deleteAll();
        memberFactory = createMemberFactory(page.request);
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
