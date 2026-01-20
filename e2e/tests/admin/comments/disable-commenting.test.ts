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

        await expect(commentsPage.getDisableCommentingMenuItem()).toBeVisible();
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

        await expect(commentsPage.getDisableCommentsModalTitle()).toBeVisible();
        await expect(commentsPage.getDisableCommentsModal()).toContainText('Test Member');
        await expect(commentsPage.getDisableCommentsModal()).toContainText('won\'t be able to comment');
        await expect(commentsPage.getDisableCommentsButton()).toBeVisible();
        await expect(commentsPage.getCancelButton()).toBeVisible();
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

        await expect(commentsPage.getDisableCommentsModal()).toBeVisible();
        await commentsPage.getCancelButton().click();

        await expect(commentsPage.getDisableCommentsModal()).toBeHidden();

        // Verify pointer-events are restored after modal closes
        // This catches the Radix UI bug where opening Dialog from DropdownMenu
        // leaves pointer-events: none on body, freezing the UI
        const bodyPointerEvents = await page.evaluate(() => {
            return window.getComputedStyle(document.body).pointerEvents;
        });
        expect(bodyPointerEvents).not.toBe('none');
    });

    test('confirming disable commenting makes API call', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create();
        const comment = await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: '<p>Test comment for API call</p>'
        });

        const commentsPage = new CommentsPage(page);
        await commentsPage.goto();
        await commentsPage.waitForComments();

        const apiCallPromise = page.waitForRequest(request => request.url().includes(`/members/${member.id}/commenting/disable`) &&
            request.method() === 'POST'
        );

        const commentRow = commentsPage.getCommentRowByText('Test comment for API call');
        await commentsPage.openMoreMenu(commentRow);
        await commentsPage.clickDisableCommenting();
        await commentsPage.confirmDisableCommenting();

        const apiCall = await apiCallPromise;
        const requestBody = apiCall.postDataJSON();
        expect(requestBody).toHaveProperty('reason');
        expect(requestBody.reason).toContain(comment.id);
    });

    test.describe('with hide comments enabled', () => {
        test.use({labs: {disableMemberCommenting: true, disableMemberCommentingHideComments: true}});

        test('hide comments checkbox appears in modal', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Test comment for hide checkbox</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Test comment for hide checkbox');
            await commentsPage.openMoreMenu(commentRow);
            await commentsPage.clickDisableCommenting();

            await expect(commentsPage.getHideCommentsCheckbox()).toBeVisible();
        });

        test('checking hide comments sends hide_comments true to API', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Test comment for hide API</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const apiCallPromise = page.waitForRequest(request => request.url().includes(`/members/${member.id}/commenting/disable`) &&
                request.method() === 'POST'
            );

            const commentRow = commentsPage.getCommentRowByText('Test comment for hide API');
            await commentsPage.openMoreMenu(commentRow);
            await commentsPage.clickDisableCommenting();
            await commentsPage.getHideCommentsCheckbox().check();
            await commentsPage.confirmDisableCommenting();

            const apiCall = await apiCallPromise;
            const requestBody = apiCall.postDataJSON();
            expect(requestBody.hide_comments).toBe(true);
        });

        test('unchecked hide comments sends hide_comments false to API', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Test comment for no hide API</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const apiCallPromise = page.waitForRequest(request => request.url().includes(`/members/${member.id}/commenting/disable`) &&
                request.method() === 'POST'
            );

            const commentRow = commentsPage.getCommentRowByText('Test comment for no hide API');
            await commentsPage.openMoreMenu(commentRow);
            await commentsPage.clickDisableCommenting();
            // Don't check the checkbox
            await commentsPage.confirmDisableCommenting();

            const apiCall = await apiCallPromise;
            const requestBody = apiCall.postDataJSON();
            expect(requestBody.hide_comments).toBe(false);
        });
    });

    // Note: These tests require backend support for can_comment field on member
    // They will pass once the backend API is merged

    test.describe('with banned member', () => {
        test.skip(true, 'Requires backend API for can_comment field - unskip when backend is merged');

        test('banned member shows indicator icon next to name', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            // Note: This requires backend support to create member with can_comment: false
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Comment from banned member</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Comment from banned member');
            await expect(commentsPage.getCommentingDisabledIndicator(commentRow)).toBeVisible();
        });

        test('enable commenting menu item appears for banned members', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            // Note: This requires backend support to create member with can_comment: false
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Comment from banned member for menu</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Comment from banned member for menu');
            await commentsPage.openMoreMenu(commentRow);

            await expect(commentsPage.getEnableCommentingMenuItem()).toBeVisible();
            await expect(commentsPage.getDisableCommentingMenuItem()).toBeHidden();
        });

        test('clicking enable commenting makes API call', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            // Note: This requires backend support to create member with can_comment: false
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Comment from banned member for enable</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const apiCallPromise = page.waitForRequest(request => request.url().includes(`/members/${member.id}/commenting/enable`) &&
                request.method() === 'POST'
            );

            const commentRow = commentsPage.getCommentRowByText('Comment from banned member for enable');
            await commentsPage.openMoreMenu(commentRow);
            await commentsPage.clickEnableCommenting();

            const apiCall = await apiCallPromise;
            expect(apiCall.method()).toBe('POST');
        });
    });
});
