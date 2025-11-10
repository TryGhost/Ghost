import {MemberDetailsPage, MembersPage} from '../../../helpers/pages';
import {MemberFactory, createMemberFactory} from '../../../data-factory';
import {expect, test} from '../../../helpers/playwright';

test.describe('Ghost Admin - Members', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('creates a new member with valid details', async ({page}) => {
        const memberToCreate = memberFactory.build({labels: ['test'], email: 'membertocreate@ghost.org'});

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.nameInput.fill(memberToCreate.name);
        await memberDetailsPage.emailInput.fill(memberToCreate.email);
        await memberDetailsPage.noteInput.fill(memberToCreate.note);
        await memberDetailsPage.addLabel(memberToCreate.labels[0]);
        await memberDetailsPage.save();

        await membersPage.goto();

        await expect(membersPage.memberListItems).toHaveCount(1);
        await expect(membersPage.getMemberEmail(memberToCreate.name)).toHaveText('membertocreate@ghost.org');
    });

    test('cannot create a member with invalid email', async ({page}) => {
        const memberToCreate = memberFactory.build({email: 'invalid-email-address'});

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.nameInput.fill(memberToCreate.name);
        await memberDetailsPage.emailInput.fill(memberToCreate.email);
        await memberDetailsPage.noteInput.fill(memberToCreate.note);
        await memberDetailsPage.saveButton.click();

        await expect(memberDetailsPage.retryButton).toBeVisible();
        await expect(memberDetailsPage.body).toContainText('Invalid Email');
    });

    test('updates an existing member', async ({page}) => {
        const memberToCreate = await memberFactory.create({
            name: 'Original Name',
            email: 'original@example.com',
            note: 'original note',
            labels: ['original']
        });

        const membersPage = new MembersPage(page);
        await membersPage.goto();

        // Edit the member
        await membersPage.goto();
        await membersPage.getMemberByName(memberToCreate.name).click();

        const editedMember = memberFactory.build({
            name: 'Test Member Edited',
            email: 'edited@ghost.org',
            note: 'This is an edited test member'
        });

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.nameInput.fill(editedMember.name);
        await memberDetailsPage.emailInput.fill(editedMember.email);
        await memberDetailsPage.noteInput.fill(editedMember.note);
        await memberDetailsPage.removeLabel();
        await memberDetailsPage.subscriptionToggle.click();
        await memberDetailsPage.save();

        await membersPage.goto();

        await expect(membersPage.memberListItems).toHaveCount(1);
        await expect(membersPage.getMemberByName(editedMember.name)).toBeVisible();
        await expect(membersPage.getMemberEmail(editedMember.name)).toHaveText('edited@ghost.org');
    });

    test('cannot update an existing member with invalid email', async ({page}) => {
        const {name, email, note} = memberFactory.build({email: 'membertocreate@ghost.org'});

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.nameInput.fill(name);
        await memberDetailsPage.emailInput.fill(email);
        await memberDetailsPage.noteInput.fill(note);
        await memberDetailsPage.save();

        await memberDetailsPage.emailInput.fill('invalid-email-address');
        await memberDetailsPage.saveButton.click();

        await expect(memberDetailsPage.retryButton).toBeVisible();
        await expect(memberDetailsPage.body).toContainText('Invalid Email');

        await membersPage.goto();
        await memberDetailsPage.confirmLeaveButton.click();
        await expect(membersPage.getMemberEmail('membertocreate@ghost.org')).toBeVisible();
    });

    test('deletes an existing member', async ({page}) => {
        const {name} = await memberFactory.create();

        const membersPage = new MembersPage(page);
        await membersPage.goto();

        await membersPage.goto();
        await membersPage.getMemberByName(name).click();

        // Delete the member
        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.memberActionsButton.click();
        await memberDetailsPage.deleteButton.click();
        await memberDetailsPage.confirmDeleteButton.click();

        await expect(membersPage.emptyStateHeading).toBeVisible();
    });
});
