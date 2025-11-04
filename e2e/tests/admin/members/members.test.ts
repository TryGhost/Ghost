import {MemberDetailsPage, MembersPage} from '../../../helpers/pages';
import {expect, test} from '../../../helpers/playwright';

test.describe('Ghost Admin - Members', () => {
    test('creates a new member with valid details', async ({page}) => {
        const memberData = {
            name: 'Test Member',
            email: 'john@testmember.com',
            note: 'This is a test member',
            label: 'Test Label'
        };

        const membersPage = new MembersPage(page);
        const memberDetailsPage = new MemberDetailsPage(page);
        await membersPage.goto();

        await membersPage.newMemberButton.click();
        await memberDetailsPage.nameInput.fill(memberData.name);
        await memberDetailsPage.emailInput.fill(memberData.email);
        await memberDetailsPage.noteInput.fill(memberData.note);
        await memberDetailsPage.addLabel(memberData.label);
        await memberDetailsPage.save();

        await membersPage.goto();

        await expect(membersPage.memberListItems).toHaveCount(1);
        await expect(membersPage.getMemberEmail(memberData.name)).toHaveText(memberData.email);
    });
});
