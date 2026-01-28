import {CommentFactory, MemberFactory, PostFactory, createCommentFactory, createMemberFactory, createPostFactory} from '@/data-factory';
import {CommentsPage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

const useReactShell = process.env.USE_REACT_SHELL === 'true';

test.describe('Ghost Admin - Disable Commenting', () => {
    test.skip(!useReactShell, 'Skipping: requires USE_REACT_SHELL=true');
    test.use({labs: {disableMemberCommenting: true}});

    let postFactory: PostFactory;
    let memberFactory: MemberFactory;
    let commentFactory: CommentFactory;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
        memberFactory = createMemberFactory(page.request);
        commentFactory = createCommentFactory(page.request);

        const settingsService = new SettingsService(page.request);
        await settingsService.setCommentsEnabled('all');
    });

    test('disable commenting menu item appears in comment menu', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create();
        await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: '<p>Test comment for disable menu</p>'
        });

        const commentsPage = new CommentsPage(page);
        await commentsPage.goto();
        await commentsPage.waitForComments();

        const commentRow = commentsPage.getCommentRowByText('Test comment for disable menu');
        await commentsPage.openMoreMenu(commentRow);

        await expect(commentsPage.disableCommentingMenuItem).toBeVisible();
    });

    test('clicking disable commenting opens confirmation modal', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create({name: 'Test Member'});
        await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: '<p>Test comment for modal</p>'
        });

        const commentsPage = new CommentsPage(page);
        await commentsPage.goto();
        await commentsPage.waitForComments();

        const commentRow = commentsPage.getCommentRowByText('Test comment for modal');
        await commentsPage.openMoreMenu(commentRow);
        await commentsPage.clickDisableCommenting();

        await expect(commentsPage.disableCommentsModalTitle).toBeVisible();
        await expect(commentsPage.disableCommentsModal).toContainText('Test Member');
        await expect(commentsPage.disableCommentsModal).toContainText('won\'t be able to comment');
        await expect(commentsPage.disableCommentsButton).toBeVisible();
        await expect(commentsPage.cancelButton).toBeVisible();
    });

    test('cancel button closes the modal and restores UI interactivity', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create();
        await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: '<p>Test comment for cancel</p>'
        });

        const commentsPage = new CommentsPage(page);
        await commentsPage.goto();
        await commentsPage.waitForComments();

        const commentRow = commentsPage.getCommentRowByText('Test comment for cancel');
        await commentsPage.openMoreMenu(commentRow);
        await commentsPage.clickDisableCommenting();

        await expect(commentsPage.disableCommentsModal).toBeVisible();
        await commentsPage.cancelButton.click();

        await expect(commentsPage.disableCommentsModal).toBeHidden();

        // Verify UI is still interactive by opening menu again
        await commentsPage.openMoreMenu(commentRow);
        await expect(commentsPage.disableCommentingMenuItem).toBeVisible();
    });

    test.describe('disable/enable commenting flow', () => {
        test('members can comment by default - no disabled indicator shown', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Comment from enabled member</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Comment from enabled member');
            await expect(commentsPage.commentingDisabledIndicator(commentRow)).toBeHidden();

            await commentsPage.openMoreMenu(commentRow);
            await expect(commentsPage.disableCommentingMenuItem).toBeVisible();
            await expect(commentsPage.enableCommentingMenuItem).toBeHidden();
        });

        test('disabling commenting shows disabled indicator and changes menu', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Test comment for disable flow</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Test comment for disable flow');
            await commentsPage.openMoreMenu(commentRow);
            await commentsPage.clickDisableCommenting();
            await commentsPage.confirmDisableCommenting();

            await expect(commentsPage.disableCommentsModal).toBeHidden();
            await expect(commentsPage.commentingDisabledIndicator(commentRow)).toBeVisible();

            await commentsPage.openMoreMenu(commentRow);
            await expect(commentsPage.enableCommentingMenuItem).toBeVisible();
            await expect(commentsPage.disableCommentingMenuItem).toBeHidden();
        });

        test('re-enabling commenting removes indicator and restores menu', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Comment for enable flow</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Comment for enable flow');

            // First disable commenting
            await commentsPage.openMoreMenu(commentRow);
            await commentsPage.clickDisableCommenting();
            await commentsPage.confirmDisableCommenting();
            await expect(commentsPage.commentingDisabledIndicator(commentRow)).toBeVisible();

            // Then re-enable commenting
            await commentsPage.openMoreMenu(commentRow);
            await commentsPage.clickEnableCommenting();

            await expect(commentsPage.commentingDisabledIndicator(commentRow)).toBeHidden();

            await commentsPage.openMoreMenu(commentRow);
            await expect(commentsPage.disableCommentingMenuItem).toBeVisible();
            await expect(commentsPage.enableCommentingMenuItem).toBeHidden();
        });
    });
});
