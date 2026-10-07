import { MemberDetailsPage, MembersListPage } from '@/admin-pages';
import { MemberFactory, createMemberFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Ghost Admin - Legacy Member Detail Flows', () => {
  let memberFactory: MemberFactory;

  test.beforeEach(async ({ page }) => {
    memberFactory = createMemberFactory(page.request);
  });

  test('creates a new member with valid details', async ({ page }) => {
    const memberToCreate = memberFactory.build({ email: 'membertocreate@ghost.org' });

    const membersPage = new MembersListPage(page);
    await membersPage.goto();
    await membersPage.newMemberButton.click();

    const memberDetailsPage = new MemberDetailsPage(page);
    await memberDetailsPage.fillMemberDetails(
      memberToCreate.name!,
      memberToCreate.email,
      memberToCreate.note!,
    );
    await memberDetailsPage.saveButton.click();
    // Creating redirects to the new member's own URL; the Save button never
    // settles on "Saved" here, so the redirect is the completion signal.
    await expect(page).toHaveURL(/#\/members\/[0-9a-f]{24}/);

    await membersPage.goto();

    await expect(membersPage.memberRows).toHaveCount(1);
    await expect(membersPage.getMemberByName(memberToCreate.name!)).toContainText(
      'membertocreate@ghost.org',
    );
  });

  test('cannot create a member with invalid email', async ({ page }) => {
    const memberToCreate = memberFactory.build({ email: 'invalid-email-address' });

    const membersPage = new MembersListPage(page);
    await membersPage.goto();
    await membersPage.newMemberButton.click();

    const memberDetailsPage = new MemberDetailsPage(page);
    await memberDetailsPage.fillMemberDetails(
      memberToCreate.name!,
      memberToCreate.email,
      memberToCreate.note!,
    );

    await expect(memberDetailsPage.saveButton).toBeDisabled();
  });

  test('updates an existing member', async ({ page }) => {
    const memberToEdit = await memberFactory.create({
      name: 'Original Name',
      email: 'original@example.com',
      note: 'original note',
    });

    const membersPage = new MembersListPage(page);
    await membersPage.goto();
    await membersPage.openMemberByName(memberToEdit.name!);

    const editedMember = memberFactory.build({
      name: 'Test Member Edited',
      email: 'edited@ghost.org',
      note: 'This is an edited test member',
    });

    const memberDetailsPage = new MemberDetailsPage(page);
    await memberDetailsPage.fillMemberDetails(
      editedMember.name!,
      editedMember.email,
      editedMember.note!,
    );
    await memberDetailsPage.save();

    await membersPage.goto();

    await expect(membersPage.memberRows).toHaveCount(1);
    await expect(membersPage.getMemberByName(editedMember.name!)).toContainText('edited@ghost.org');
  });

  test('cannot update an existing member with invalid email', async ({ page }) => {
    const memberToEdit = await memberFactory.create({
      name: 'Test Member',
      email: 'membertocreate@ghost.org',
      note: 'note',
    });

    const membersPage = new MembersListPage(page);
    await membersPage.goto();
    await membersPage.openMemberByName(memberToEdit.name!);

    const memberDetailsPage = new MemberDetailsPage(page);
    // Save also starts disabled while the form is untouched, so a valid edit has to
    // enable it first for the assertion below to be about the email at all.
    await memberDetailsPage.nameInput.fill('Test Member Edited');
    await expect(memberDetailsPage.saveButton).toBeEnabled();

    await memberDetailsPage.emailInput.fill('invalid-email-address');

    await expect(memberDetailsPage.saveButton).toBeDisabled();
  });

  test('deletes an existing member', async ({ page }) => {
    const member = await memberFactory.create();

    const membersPage = new MembersListPage(page);
    await membersPage.goto();
    await membersPage.openMemberByName(member.name!);

    const memberDetailsPage = new MemberDetailsPage(page);
    await memberDetailsPage.settingsSection.memberActionsButton.click();
    await memberDetailsPage.settingsSection.deleteButton.click();
    await memberDetailsPage.settingsSection.confirmDeleteButton.click();

    await expect(membersPage.emptyState).toBeVisible();
  });
});
