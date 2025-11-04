import {MemberDetailsPage, MembersPage} from '../../../helpers/pages';
import {expect, test} from '../../../helpers/playwright';

test.describe('Ghost Admin - Members', () => {
    function fakeMemberData() {
        return {
            name: 'Test Member',
            email: 'john@testmember.com',
            note: 'This is a test member',
            label: 'Test Label'
        };
    }

    test('creates a new member with valid details', async ({page}) => {
        const memberData = fakeMemberData();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.nameInput.fill(memberData.name);
        await memberDetailsPage.emailInput.fill(memberData.email);
        await memberDetailsPage.noteInput.fill(memberData.note);
        await memberDetailsPage.addLabel(memberData.label);
        await memberDetailsPage.save();

        await membersPage.goto();

        await expect(membersPage.memberListItems).toHaveCount(1);
        await expect(membersPage.getMemberEmail(memberData.name)).toHaveText(memberData.email);
    });

    test('cannot create a member with invalid email', async ({page}) => {
        const memberData = fakeMemberData();
        memberData.email = 'invalid-email';

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.nameInput.fill(memberData.name);
        await memberDetailsPage.emailInput.fill(memberData.email);
        await memberDetailsPage.noteInput.fill(memberData.note);
        await memberDetailsPage.addLabel(memberData.label);
        await memberDetailsPage.saveButton.click();

        await expect(memberDetailsPage.retryButton).toBeVisible();
        await expect(page.getByText('Invalid Email')).toBeVisible();
    });

    test('edits an existing member', async ({page}) => {
        const originalData = fakeMemberData();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        // Create a new member
        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.nameInput.fill(originalData.name);
        await memberDetailsPage.emailInput.fill(originalData.email);
        await memberDetailsPage.noteInput.fill(originalData.note);
        await memberDetailsPage.addLabel(originalData.label);
        await memberDetailsPage.save();

        // Edit the member
        await membersPage.goto();
        await membersPage.getMemberByName(originalData.name).click();

        const editedData = {
            name: 'Test Member Edited',
            email: 'tester.edited@example.com',
            note: 'This is an edited test member'
        };

        await memberDetailsPage.nameInput.fill(editedData.name);
        await memberDetailsPage.emailInput.fill(editedData.email);
        await memberDetailsPage.noteInput.fill(editedData.note);
        await memberDetailsPage.removeLabel();
        await memberDetailsPage.subscriptionToggle.click();
        await memberDetailsPage.save();

        await membersPage.goto();

        await expect(membersPage.memberListItems).toHaveCount(1);
        await expect(membersPage.getMemberByName(editedData.name)).toBeVisible();
        await expect(membersPage.getMemberEmail(editedData.name)).toHaveText(editedData.email);
    });

    test('deletes an existing member', async ({page}) => {
        const memberData = fakeMemberData();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        // Create a new member
        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.nameInput.fill(memberData.name);
        await memberDetailsPage.emailInput.fill(memberData.email);
        await memberDetailsPage.save();

        await membersPage.goto();
        await membersPage.getMemberByName(memberData.name).click();

        // Delete the member
        await memberDetailsPage.memberActionsButton.click();
        await memberDetailsPage.deleteButton.click();
        await memberDetailsPage.confirmDeleteButton.click();

        // Verify empty state
        await expect(membersPage.emptyStateHeading).toBeVisible();
    });
});
