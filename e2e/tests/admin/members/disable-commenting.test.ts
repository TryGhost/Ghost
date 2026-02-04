import {CommentFactory, MemberFactory, PostFactory, createCommentFactory, createMemberFactory, createPostFactory} from '@/data-factory';
import {CommentsPage, MemberDetailsPage, MembersPage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Member Detail Disable Commenting', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('disable commenting menu item appears in member actions', async ({page}) => {
        const {name} = await memberFactory.create();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.getMemberByName(name!).click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();

        await expect(memberDetailsPage.settingsSection.disableCommentingButton).toBeVisible();
    });

    test('clicking disable commenting opens confirmation modal', async ({page}) => {
        const {name} = await memberFactory.create({name: 'Test Member'});

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.getMemberByName(name!).click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();

        await expect(memberDetailsPage.disableCommentingModal).toBeVisible();
        await expect(memberDetailsPage.disableCommentingModal).toContainText('Test Member');
        await expect(memberDetailsPage.disableCommentingModal).toContainText('won\'t be able to comment');
        await expect(memberDetailsPage.disableCommentingConfirmButton).toBeVisible();
        await expect(memberDetailsPage.disableCommentingCancelButton).toBeVisible();
    });

    test('cancel button closes the modal', async ({page}) => {
        const {name} = await memberFactory.create();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.getMemberByName(name!).click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();

        await expect(memberDetailsPage.disableCommentingModal).toBeVisible();
        await memberDetailsPage.disableCommentingCancelButton.click();

        await expect(memberDetailsPage.disableCommentingModal).toBeHidden();
    });

    test('hide comments checkbox appears in modal', async ({page}) => {
        const {name} = await memberFactory.create();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.getMemberByName(name!).click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();

        await expect(memberDetailsPage.hideCommentsCheckbox).toBeVisible();
    });

    test('disabling commenting shows disabled indicator', async ({page}) => {
        const {name} = await memberFactory.create();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.getMemberByName(name!).click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.disableCommentingButton.click();
        await memberDetailsPage.disableCommentingConfirmButton.click();

        await expect(memberDetailsPage.disableCommentingModal).toBeHidden();
        await expect(memberDetailsPage.commentingDisabledIndicator).toBeVisible();
    });

    test.describe('disable/enable commenting flow', () => {
        test('no disabled indicator shown by default', async ({page}) => {
            const {name} = await memberFactory.create();

            const membersPage = new MembersPage(page);
            await membersPage.goto();
            await membersPage.getMemberByName(name!).click();

            const memberDetailsPage = new MemberDetailsPage(page);
            await expect(memberDetailsPage.commentingDisabledIndicator).toBeHidden();

            await memberDetailsPage.settingsSection.memberActionsButton.click();
            await expect(memberDetailsPage.settingsSection.disableCommentingButton).toBeVisible();
            await expect(memberDetailsPage.settingsSection.enableCommentingButton).toBeHidden();
        });

        test('disabling changes menu to show enable option', async ({page}) => {
            const {name} = await memberFactory.create();

            const membersPage = new MembersPage(page);
            await membersPage.goto();
            await membersPage.getMemberByName(name!).click();

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
            const {name} = await memberFactory.create();

            const membersPage = new MembersPage(page);
            await membersPage.goto();
            await membersPage.getMemberByName(name!).click();

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
            const {name} = await memberFactory.create();

            const membersPage = new MembersPage(page);
            await membersPage.goto();
            await membersPage.getMemberByName(name!).click();

            const memberDetailsPage = new MemberDetailsPage(page);

            await memberDetailsPage.settingsSection.memberActionsButton.click();
            await memberDetailsPage.settingsSection.disableCommentingButton.click();
            await memberDetailsPage.disableCommentingConfirmButton.click();
            await expect(memberDetailsPage.commentingDisabledIndicator).toBeVisible();

            await memberDetailsPage.enableCommentingLink.click();

            await expect(memberDetailsPage.commentingDisabledIndicator).toBeHidden();
        });
    });
});

test.describe('Ghost Admin - Disable Commenting Cache Invalidation', () => {
    let memberFactory: MemberFactory;
    let postFactory: PostFactory;
    let commentFactory: CommentFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
        postFactory = createPostFactory(page.request);
        commentFactory = createCommentFactory(page.request);

        const settingsService = new SettingsService(page.request);
        await settingsService.setCommentsEnabled('all');
    });

    test('hiding comments from member detail reflects on comments page', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create({name: 'Cache Test Member'});
        await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: '<p>Comment to be hidden via member page</p>'
        });

        // Navigate to comments page and verify comment is visible and not hidden
        const commentsPage = new CommentsPage(page);
        await commentsPage.goto();
        await commentsPage.waitForComments();

        const commentRow = commentsPage.getCommentRowByText('Comment to be hidden via member page');
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
        const updatedCommentRow = commentsPage.getCommentRowByText('Comment to be hidden via member page');
        await expect(updatedCommentRow).toBeVisible();
        await expect(updatedCommentRow.getByText('Hidden', {exact: true})).toBeVisible();
    });
});
