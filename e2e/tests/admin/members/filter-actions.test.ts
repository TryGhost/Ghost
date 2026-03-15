import {expect, test} from '@/helpers/playwright';

import {MemberFactory, createMemberFactory} from '@/data-factory';
import {MembersPage} from '@/admin-pages';

test.describe('Ghost Admin - Member Filter Actions', () => {
    let memberFactory: MemberFactory;

    const membersFixture = [
        {
            name: 'Test Member 1',
            email: 'test@member1.com',
            note: 'This is a test member',
            labels: ['old']
        },
        {
            name: 'Test Member 2',
            email: 'test@member2.com',
            note: 'This is a test member',
            labels: ['old']
        },
        {
            name: 'Sashi',
            email: 'test@member4.com',
            note: 'This is a test member',
            labels: ['dog']
        },
        {
            name: 'Mia',
            email: 'test@member5.com',
            note: 'This is a test member',
            labels: ['dog']
        },
        {
            name: 'Minki',
            email: 'test@member6.com',
            note: 'This is a test member',
            labels: ['dog']
        }
    ];

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('filters members and adds a label to filtered members', async ({page}) => {
        await memberFactory.createMany(membersFixture);

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.filterSection.applyLabel('old');
        await expect(membersPage.memberListItems).toHaveCount(2);

        await membersPage.membersActionsButton.click();
        await membersPage.settingsSection.addLabelToSelectedMembers('dog');

        await expect(membersPage.settingsSection.getSuccessMessage()).toContainText('Label added to 2 members successfully');
        await membersPage.settingsSection.closeModalButton.click();
    });

    test('removes a label from filtered members', async ({page}) => {
        await memberFactory.createMany(membersFixture);

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.filterSection.applyLabel('old');
        await expect(membersPage.memberListItems).toHaveCount(2);

        await membersPage.membersActionsButton.click();
        await membersPage.settingsSection.removeLabelFromSelectedMembers('old');

        await expect(membersPage.settingsSection.getSuccessMessage()).toContainText('Label removed from 2 members successfully');
    });
});
