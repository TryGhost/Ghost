import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersListPage} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Members Label Lifecycle', () => {
    let memberFactory: MemberFactory;
    let membersPage: MembersListPage;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
        await memberFactory.createMany([
            {name: 'Labelled Member', email: 'labelled@example.com', labels: ['Existing-Label']}
        ]);
        membersPage = new MembersListPage(page);
        await membersPage.goto();
        await membersPage.addMultiselectFilter('Label', ['Existing-Label']);
        await membersPage.openFilterValue('Label');
    });

    test('creates a label, adopts an out-of-band duplicate, deletes it and recreates it', async ({page}) => {
        await membersPage.searchMultiselectOptions('Lifecycle-One');
        await page.getByRole('button', {name: 'Create "Lifecycle-One"'}).click();
        await expect(page.getByRole('option', {name: /Lifecycle-One/})).toBeVisible();

        // An exact match among the loaded labels hides the create action
        await membersPage.searchMultiselectOptions('Lifecycle-One');
        await expect(page.getByRole('option', {name: /Lifecycle-One/})).toBeVisible();
        await expect(page.getByRole('button', {name: 'Create "Lifecycle-One"'})).toBeHidden();

        // A label created outside this session (e.g. by another admin) is not
        // in the loaded list, so the create action shows; creating it adopts
        // and selects the existing label instead of surfacing an error. This
        // relies on the picker's client-side label cache staying stale while
        // the popover is open
        await memberFactory.createMany([
            {name: 'Sneaky Member', email: 'sneaky@example.com', labels: ['Sneaky-Label']}
        ]);
        await membersPage.searchMultiselectOptions('Sneaky-Label');
        await page.getByRole('button', {name: 'Create "Sneaky-Label"'}).click();
        await expect(page.getByRole('option', {name: /Sneaky-Label/})).toBeVisible();
        await expect(page.getByText('Label already exists')).toBeHidden();
        await expect(membersPage.multiselectSearchInput).toHaveValue('');

        await membersPage.searchMultiselectOptions('Lifecycle-Two');
        await page.getByRole('button', {name: 'Create "Lifecycle-Two"'}).click();
        await expect(page.getByRole('option', {name: /Lifecycle-Two/})).toBeVisible();

        // The inline edit affordance only renders on unselected options, so
        // deselect the label created (and auto-selected) above before deleting
        await membersPage.searchMultiselectOptions('');
        await membersPage.selectMultiselectOption('Lifecycle-One');
        await page.getByRole('button', {name: 'Edit label Lifecycle-One'}).click();
        await page.getByRole('button', {name: 'Delete', exact: true}).click();
        await page.getByRole('button', {name: 'Delete', exact: true}).click();
        await expect(page.getByRole('option', {name: /Lifecycle-One/})).toBeHidden();

        await membersPage.searchMultiselectOptions('Lifecycle-One');
        await page.getByRole('button', {name: 'Create "Lifecycle-One"'}).click();
        await expect(page.getByRole('option', {name: /Lifecycle-One/})).toBeVisible();
    });
});
