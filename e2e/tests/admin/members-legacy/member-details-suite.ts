import {APIRequestContext} from '@playwright/test';
import {MemberDetailsPage, MembersListPage} from '@/admin-pages';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {faker} from '@faker-js/faker';

function uniqueName(prefix: string) {
    return `${prefix} ${faker.string.alphanumeric(6)}`;
}

function uniqueEmail(prefix: string) {
    return `${prefix}-${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
}

async function getActiveNewsletterIds(request: APIRequestContext): Promise<string[]> {
    const response = await request.get('/ghost/api/admin/newsletters/?status=active&limit=all');
    const data = await response.json();
    return data.newsletters.map((newsletter: {id: string}) => newsletter.id);
}

/**
 * Member detail screen tests, shared between the Ember implementation (labs
 * flag off, the default) and the React implementation (labs flag
 * `memberDetailsX` on).
 *
 * Tests are intentionally order-independent: every test creates its own data
 * via factories or the UI with unique names and emails, so the suite is safe
 * under per-file environment reuse.
 */
export function defineMemberDetailsTests() {
    test('creates a new member with valid details', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const memberToCreate = memberFactory.build({
            name: uniqueName('New member'),
            email: uniqueEmail('new-member')
        });

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.fillMemberDetails(memberToCreate.name!, memberToCreate.email, memberToCreate.note!);
        await memberDetailsPage.save();

        await membersPage.goto();

        await expect(membersPage.getMemberByName(memberToCreate.name!)).toBeVisible();
        await expect(membersPage.getMemberByName(memberToCreate.name!)).toContainText(memberToCreate.email);
    });

    test('cannot create a member with invalid email', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const memberToCreate = memberFactory.build({
            name: uniqueName('Invalid member'),
            email: 'invalid-email-address'
        });

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.fillMemberDetails(memberToCreate.name!, memberToCreate.email, memberToCreate.note!);
        await memberDetailsPage.saveButton.click();

        await expect(memberDetailsPage.retryButton).toBeVisible();
        await expect(memberDetailsPage.body).toContainText('Invalid Email');
    });

    test('updates an existing member', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const memberToEdit = await memberFactory.create({
            name: uniqueName('Original member'),
            email: uniqueEmail('original'),
            note: 'original note'
        });
        const editedName = uniqueName('Edited member');
        const editedEmail = uniqueEmail('edited');

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await membersPage.openMemberByName(memberToEdit.name!);

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.fillMemberDetails(editedName, editedEmail, 'This is an edited test member');
        await memberDetailsPage.save();

        await membersPage.goto();

        await expect(membersPage.getMemberByName(editedName)).toBeVisible();
        await expect(membersPage.getMemberByName(editedName)).toContainText(editedEmail);
        await expect(membersPage.getMemberByName(memberToEdit.name!)).toBeHidden();
    });

    test('cannot update an existing member with invalid email', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const memberToEdit = await memberFactory.create({
            name: uniqueName('Valid member'),
            email: uniqueEmail('valid'),
            note: 'note'
        });

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await membersPage.openMemberByName(memberToEdit.name!);

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.emailInput.fill('invalid-email-address');
        await memberDetailsPage.saveButton.click();

        await expect(memberDetailsPage.retryButton).toBeVisible();
        await expect(memberDetailsPage.body).toContainText('Invalid Email');
    });

    test('deletes an existing member', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const sentinel = await memberFactory.create({name: uniqueName('Sentinel member')});
        const memberToDelete = await memberFactory.create({name: uniqueName('Doomed member')});

        const membersPage = new MembersListPage(page);
        await membersPage.goto();
        await membersPage.openMemberByName(memberToDelete.name!);

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.deleteButton.click();
        await memberDetailsPage.settingsSection.confirmDeleteButton.click();

        await expect(membersPage.getMemberByName(sentinel.name!)).toBeVisible();
        await expect(membersPage.getMemberByName(memberToDelete.name!)).toBeHidden();
    });

    test('warns about unsaved changes - staying keeps the edits', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const member = await memberFactory.create({name: uniqueName('Unsaved member')});

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.gotoMember(member.id);
        await expect(memberDetailsPage.nameInput).toHaveValue(member.name!);
        await memberDetailsPage.nameInput.fill('Unsaved member name');
        await memberDetailsPage.membersBackLink.click();

        await expect(memberDetailsPage.unsavedChangesModal).toBeVisible();
        await memberDetailsPage.unsavedChangesStayButton.click();

        await expect(memberDetailsPage.unsavedChangesModal).toBeHidden();
        await expect(page).toHaveURL(new RegExp(`/ghost/#/members/${member.id}`));
        await expect(memberDetailsPage.nameInput).toHaveValue('Unsaved member name');
    });

    test('warns about unsaved changes - leaving discards the edits', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const member = await memberFactory.create({name: uniqueName('Discard member')});

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.gotoMember(member.id);
        await expect(memberDetailsPage.nameInput).toHaveValue(member.name!);
        await memberDetailsPage.nameInput.fill('Discarded member name');
        await memberDetailsPage.membersBackLink.click();

        await expect(memberDetailsPage.unsavedChangesModal).toBeVisible();
        await memberDetailsPage.unsavedChangesLeaveButton.click();

        const membersPage = new MembersListPage(page);
        await expect(membersPage.getMemberByName(member.name!)).toBeVisible();
        await expect(membersPage.getMemberByName('Discarded member name')).toBeHidden();
    });

    test('newsletter subscription can be toggled off and persists', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const newsletterIds = await getActiveNewsletterIds(page.request);
        const member = await memberFactory.create({
            name: uniqueName('Subscribed member'),
            email: uniqueEmail('subscribed'),
            newsletters: newsletterIds.map(id => ({id}))
        });

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.gotoMember(member.id);
        await expect(memberDetailsPage.newsletterSubscriptionCheckboxes.first()).toBeChecked();

        await memberDetailsPage.clickNewsletterSubscriptionToggle(0);
        await memberDetailsPage.save();
        await memberDetailsPage.refresh();

        await expect(memberDetailsPage.newsletterSubscriptionCheckboxes.first()).not.toBeChecked();
    });

    test('note can be edited and persists', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const member = await memberFactory.create({
            name: uniqueName('Noted member'),
            note: 'original note'
        });
        const updatedNote = `Updated note ${faker.string.alphanumeric(6)}`;

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.gotoMember(member.id);
        await expect(memberDetailsPage.noteInput).toHaveValue('original note');

        await memberDetailsPage.noteInput.fill(updatedNote);
        await memberDetailsPage.save();
        await memberDetailsPage.refresh();

        await expect(memberDetailsPage.noteInput).toHaveValue(updatedNote);
    });
}
