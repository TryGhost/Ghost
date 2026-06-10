import {CommentsPage, MemberDetailsPage, MembersPage} from '@/helpers/pages';
import {Page} from '@playwright/test';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {createCommentFactory, createMemberFactory, createPostFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {faker} from '@faker-js/faker';

function uniqueName(prefix: string) {
    return `${prefix} ${faker.string.alphanumeric(6)}`;
}

async function createMemberAndOpenDetails(page: Page, name: string) {
    const memberFactory = createMemberFactory(page.request);
    const member = await memberFactory.create({name});

    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.getMemberByName(name).click();

    return member;
}

/**
 * Member detail disable/enable commenting tests, shared between the Ember
 * implementation (labs flag off, the default) and the React implementation
 * (labs flag `memberDetailsX` on).
 *
 * Tests are order-independent: every test creates its own member with a
 * unique name, so the suite is safe under per-file environment reuse.
 */
export function defineDisableCommentingTests() {
    test('disable commenting menu item appears in member actions', async ({page}) => {
        await createMemberAndOpenDetails(page, uniqueName('Comment member'));

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();

        await expect(memberDetailsPage.settingsSection.disableCommentingButton).toBeVisible();
    });

    test('clicking disable commenting opens confirmation modal', async ({page}) => {
        const name = uniqueName('Comment member');
        await createMemberAndOpenDetails(page, name);

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();

        await expect(memberDetailsPage.disableCommentingModal).toBeVisible();
        await expect(memberDetailsPage.disableCommentingModal).toContainText(name);
        await expect(memberDetailsPage.disableCommentingModal).toContainText('won\'t be able to comment');
        await expect(memberDetailsPage.disableCommentingConfirmButton).toBeVisible();
        await expect(memberDetailsPage.disableCommentingCancelButton).toBeVisible();
    });

    test('cancel button closes the modal', async ({page}) => {
        await createMemberAndOpenDetails(page, uniqueName('Comment member'));

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();

        await expect(memberDetailsPage.disableCommentingModal).toBeVisible();
        await memberDetailsPage.disableCommentingCancelButton.click();

        await expect(memberDetailsPage.disableCommentingModal).toBeHidden();
    });

    test('hide comments checkbox appears in modal', async ({page}) => {
        await createMemberAndOpenDetails(page, uniqueName('Comment member'));

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();

        await expect(memberDetailsPage.hideCommentsCheckbox).toBeVisible();
    });

    test('disabling commenting shows disabled indicator', async ({page}) => {
        await createMemberAndOpenDetails(page, uniqueName('Comment member'));

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();
        await memberDetailsPage.disableCommentingConfirmButton.click();

        await expect(memberDetailsPage.disableCommentingModal).toBeHidden();
        await expect(memberDetailsPage.commentingDisabledIndicator).toBeVisible();
    });

    test('no disabled indicator shown by default', async ({page}) => {
        await createMemberAndOpenDetails(page, uniqueName('Comment member'));

        const memberDetailsPage = new MemberDetailsPage(page);
        await expect(memberDetailsPage.commentingDisabledIndicator).toBeHidden();

        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await expect(memberDetailsPage.settingsSection.disableCommentingButton).toBeVisible();
        await expect(memberDetailsPage.settingsSection.enableCommentingButton).toBeHidden();
    });

    test('disabling changes menu to show enable option', async ({page}) => {
        await createMemberAndOpenDetails(page, uniqueName('Comment member'));

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();
        await memberDetailsPage.disableCommentingConfirmButton.click();

        await expect(memberDetailsPage.disableCommentingModal).toBeHidden();
        await expect(memberDetailsPage.commentingDisabledIndicator).toBeVisible();

        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await expect(memberDetailsPage.settingsSection.enableCommentingButton).toBeVisible();
        await expect(memberDetailsPage.settingsSection.disableCommentingButton).toBeHidden();
    });

    test('re-enabling via menu removes indicator and restores menu', async ({page}) => {
        await createMemberAndOpenDetails(page, uniqueName('Comment member'));

        const memberDetailsPage = new MemberDetailsPage(page);

        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();
        await memberDetailsPage.disableCommentingConfirmButton.click();
        await expect(memberDetailsPage.commentingDisabledIndicator).toBeVisible();

        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.enableCommentingButton.click();

        await expect(memberDetailsPage.commentingDisabledIndicator).toBeHidden();

        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await expect(memberDetailsPage.settingsSection.disableCommentingButton).toBeVisible();
        await expect(memberDetailsPage.settingsSection.enableCommentingButton).toBeHidden();
    });

    test('enabling via sidebar link removes indicator', async ({page}) => {
        await createMemberAndOpenDetails(page, uniqueName('Comment member'));

        const memberDetailsPage = new MemberDetailsPage(page);

        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();
        await memberDetailsPage.disableCommentingConfirmButton.click();
        await expect(memberDetailsPage.commentingDisabledIndicator).toBeVisible();

        await memberDetailsPage.enableCommentingLink.click();

        await expect(memberDetailsPage.commentingDisabledIndicator).toBeHidden();
    });

    test('hiding comments from member detail reflects on comments page', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const postFactory = createPostFactory(page.request);
        const commentFactory = createCommentFactory(page.request);
        const settingsService = new SettingsService(page.request);
        await settingsService.setCommentsEnabled('all');

        const commentText = `Comment to be hidden via member page ${faker.string.alphanumeric(6)}`;
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create({name: uniqueName('Cache member')});
        await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: `<p>${commentText}</p>`
        });

        // Navigate to comments page and verify comment is visible and not hidden
        const commentsPage = new CommentsPage(page);
        await commentsPage.goto();
        await commentsPage.waitForComments();

        const commentRow = commentsPage.getCommentRowByText(commentText);
        await expect(commentRow).toBeVisible();
        await expect(commentRow.getByText('Hidden', {exact: true})).toBeHidden();

        // Navigate to member detail via "View member" menu item
        await commentsPage.openMoreMenu(commentRow);
        await commentsPage.viewMemberMenuItem.click();

        // On member detail page, disable commenting with hide comments checked
        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();
        await memberDetailsPage.hideCommentsCheckbox.click();
        await memberDetailsPage.disableCommentingConfirmButton.click();

        await expect(memberDetailsPage.disableCommentingModal).toBeHidden();
        await expect(memberDetailsPage.commentingDisabledIndicator).toBeVisible();

        // Navigate back to comments page
        await commentsPage.goto();
        await commentsPage.waitForComments();

        // Verify the comment is now marked as hidden
        const updatedCommentRow = commentsPage.getCommentRowByText(commentText);
        await expect(updatedCommentRow).toBeVisible();
        await expect(updatedCommentRow.getByText('Hidden', {exact: true})).toBeVisible();
    });
}
