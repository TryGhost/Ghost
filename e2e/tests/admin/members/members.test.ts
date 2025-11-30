import {MemberDetailsPage, MembersPage} from '@/helpers/pages';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Members', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('creates a new member with valid details', async ({page}) => {
        const memberToCreate = memberFactory.build({email: 'membertocreate@ghost.org'});

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.fillMemberDetails(memberToCreate.name!, memberToCreate.email, memberToCreate.note!);
        await memberDetailsPage.save();

        await membersPage.goto();

        await expect(membersPage.memberListItems).toHaveCount(1);
        await expect(membersPage.getMemberEmail(memberToCreate.name!)).toHaveText('membertocreate@ghost.org');
    });

    test('cannot create a member with invalid email', async ({page}) => {
        const memberToCreate = memberFactory.build({email: 'invalid-email-address'});

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.fillMemberDetails(memberToCreate.name!, memberToCreate.email, memberToCreate.note!);
        await memberDetailsPage.saveButton.click();

        await expect(memberDetailsPage.retryButton).toBeVisible();
        await expect(memberDetailsPage.body).toContainText('Invalid Email');
    });

    test('updates an existing member', async ({page}) => {
        const memberToEdit = await memberFactory.create({
            name: 'Original Name',
            email: 'original@example.com',
            note: 'original note',
            labels: ['createdMemberLabel']
        });

        // Edit the member
        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.getMemberByName(memberToEdit.name!).click();

        const editedMember = memberFactory.build({
            name: 'Test Member Edited',
            email: 'edited@ghost.org',
            note: 'This is an edited test member'
        });

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.fillMemberDetails(editedMember.name!, editedMember.email, editedMember.note!);
        const labelNamesBefore = await memberDetailsPage.labelNames();
        await memberDetailsPage.removeLabel('createdMemberLabel');
        await memberDetailsPage.clickNewsletterSubscriptionToggle();
        await memberDetailsPage.save();
        await memberDetailsPage.refresh();
        const labelNamesAfter = await memberDetailsPage.labelNames();

        await membersPage.goto();

        expect(labelNamesBefore).toContain('createdMemberLabel');
        expect(labelNamesAfter).not.toContain('createdMemberLabel');
        await expect(membersPage.memberListItems).toHaveCount(1);
        await expect(membersPage.getMemberByName(editedMember.name!)).toBeVisible();
        await expect(membersPage.getMemberEmail(editedMember.name!)).toHaveText('edited@ghost.org');
    });

    test('cannot update an existing member with invalid email', async ({page}) => {
        const {name, email, note} = memberFactory.build({email: 'membertocreate@ghost.org', name: 'Test Member'});

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.fillMemberDetails(name!, email, note!);
        await memberDetailsPage.save();

        await memberDetailsPage.emailInput.fill('invalid-email-address');
        await memberDetailsPage.saveButton.click();

        await expect(memberDetailsPage.retryButton).toBeVisible();
        await expect(memberDetailsPage.body).toContainText('Invalid Email');

        await membersPage.goto();
        await memberDetailsPage.confirmLeaveButton.click();
        await expect(membersPage.getMemberEmail('Test Member')).toBeVisible();
    });

    test('deletes an existing member', async ({page}) => {
        const {name} = await memberFactory.create();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.getMemberByName(name!).click();

        // Delete the member
        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.deleteButton.click();
        await memberDetailsPage.settingsSection.confirmDeleteButton.click();

        await expect(membersPage.emptyStateHeading).toBeVisible();
    });
});
