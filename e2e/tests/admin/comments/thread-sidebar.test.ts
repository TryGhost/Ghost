import {
    CommentFactory,
    MemberFactory,
    PostFactory,
    createCommentFactory,
    createMemberFactory,
    createPostFactory
} from '@/data-factory';
import {CommentsPage} from '@/helpers/pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Thread Sidebar', () => {
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

    test.describe('thread pagination', () => {
        test.use({labs: {commentModeration: true}});

        test('loads more replies when clicking load more button', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();

            const rootComment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Root comment for pagination test</p>'
            });

            // Create 5 replies
            for (let i = 1; i <= 5; i++) {
                await commentFactory.create({
                    post_id: post.id,
                    member_id: member.id,
                    parent_id: rootComment.id,
                    html: `<p>Reply number ${i}</p>`
                });
            }

            // Intercept API to set a low limit (3) to trigger pagination
            await page.route('**/ghost/api/admin/comments/**', async (route) => {
                const url = new URL(route.request().url());
                // Only modify browse requests (not single comment reads)
                if (url.searchParams.has('filter') && url.searchParams.get('limit') === '100') {
                    url.searchParams.set('limit', '3');
                    await route.continue({url: url.toString()});
                } else {
                    await route.continue();
                }
            });

            const commentsPage = new CommentsPage(page);
            await page.goto(`/ghost/#/comments?thread=is:${rootComment.id}`);
            await commentsPage.waitForThreadSidebar();

            // Should see the root comment and first 3 replies
            await expect(commentsPage.threadSidebar.getByText('Root comment for pagination test')).toBeVisible();
            await expect(commentsPage.threadSidebar.getByText('Reply number 1')).toBeVisible();
            await expect(commentsPage.threadSidebar.getByText('Reply number 2')).toBeVisible();
            await expect(commentsPage.threadSidebar.getByText('Reply number 3')).toBeVisible();

            // Reply 4 and 5 should not be visible yet
            await expect(commentsPage.threadSidebar.getByText('Reply number 4')).toBeHidden();
            await expect(commentsPage.threadSidebar.getByText('Reply number 5')).toBeHidden();

            // Load more button should be visible
            const loadMoreButton = commentsPage.threadSidebar.getByRole('button', {name: 'Load more replies'});
            await expect(loadMoreButton).toBeVisible();

            // Click load more
            await loadMoreButton.click();

            // Now replies 4 and 5 should be visible
            await expect(commentsPage.threadSidebar.getByText('Reply number 4')).toBeVisible();
            await expect(commentsPage.threadSidebar.getByText('Reply number 5')).toBeVisible();

            // Load more button should be hidden now (no more pages)
            await expect(loadMoreButton).toBeHidden();
        });
    });

    test.describe('thread navigation', () => {
        test.use({labs: {commentModeration: true}});

        test('opening thread for root comment shows root and direct replies', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();

            const rootComment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Root comment</p>'
            });
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                parent_id: rootComment.id,
                html: '<p>Direct reply to root</p>'
            });

            const commentsPage = new CommentsPage(page);
            await page.goto(`/ghost/#/comments?thread=is:${rootComment.id}`);
            await commentsPage.waitForThreadSidebar();

            await expect(commentsPage.threadSidebar.getByText('Root comment')).toBeVisible();
            await expect(commentsPage.threadSidebar.getByText('Direct reply to root')).toBeVisible();
        });

        test('opening thread for reply comment shows reply and its children', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();

            const rootComment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Root comment</p>'
            });
            const replyComment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                parent_id: rootComment.id,
                html: '<p>First level reply</p>'
            });
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                parent_id: rootComment.id,
                in_reply_to_id: replyComment.id,
                html: '<p>Reply to first level reply</p>'
            });

            const commentsPage = new CommentsPage(page);
            await page.goto(`/ghost/#/comments?thread=is:${replyComment.id}`);
            await commentsPage.waitForThreadSidebar();

            await expect(commentsPage.threadSidebar.getByText('First level reply', {exact: true})).toBeVisible();
            await expect(commentsPage.threadSidebar.getByText('Reply to first level reply')).toBeVisible();
        });

        test('replied to link in main list opens thread focused on that comment', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();

            const rootComment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>This is the root comment that was replied to</p>'
            });
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                parent_id: rootComment.id,
                in_reply_to_id: rootComment.id,
                html: '<p>Reply that shows replied to</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const replyRow = commentsPage.getCommentRowByText('Reply that shows replied to');
            const repliedToLink = commentsPage.getRepliedToLink(replyRow);
            await repliedToLink.click();

            await commentsPage.waitForThreadSidebar();
            expect(page.url()).toContain(`thread=is%3A${rootComment.id}`);
        });

        test('clicking replies metric in main list opens thread for that comment', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();

            const rootComment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Comment with replies</p>'
            });
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                parent_id: rootComment.id,
                html: '<p>A reply to the comment</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText('Comment with replies');
            await commentsPage.openThread(commentRow);

            expect(page.url()).toContain(`thread=is%3A${rootComment.id}`);
            await expect(commentsPage.threadSidebar.getByText('Comment with replies')).toBeVisible();
            await expect(commentsPage.threadSidebar.getByText('A reply to the comment')).toBeVisible();
        });

        test('clicking replies metric in thread navigates to that reply', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();

            const rootComment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Root comment</p>'
            });
            const firstReply = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                parent_id: rootComment.id,
                html: '<p>First reply with its own replies</p>'
            });
            const nestedReply = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                parent_id: rootComment.id,
                in_reply_to_id: firstReply.id,
                html: '<p>Nested reply to first reply</p>'
            });

            const commentsPage = new CommentsPage(page);
            await page.goto(`/ghost/#/comments?thread=is:${rootComment.id}`);
            await commentsPage.waitForThreadSidebar();

            const firstReplyRow = commentsPage.getThreadCommentById(firstReply.id);
            const repliesButton = commentsPage.getRepliesButton(firstReplyRow);
            await repliesButton.click();

            await page.waitForURL(new RegExp(`thread=is%3A${firstReply.id}`));
            expect(page.url()).toContain(`thread=is%3A${firstReply.id}`);
            // Children being nested in the parent comment row required explicit targetting by ID
            await expect(commentsPage.getThreadCommentById(firstReply.id)).toBeVisible();
            await expect(commentsPage.getThreadCommentById(nestedReply.id)).toBeVisible();
        });

        test('shows replied to context for selected reply comment in thread', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();

            const rootComment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Root comment content</p>'
            });
            const replyComment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                parent_id: rootComment.id,
                in_reply_to_id: rootComment.id,
                html: '<p>Reply with replied-to context</p>'
            });

            const commentsPage = new CommentsPage(page);
            await page.goto(`/ghost/#/comments?thread=is:${replyComment.id}`);
            await commentsPage.waitForThreadSidebar();

            const selectedComment = commentsPage.getThreadCommentByText('Reply with replied-to context');
            await expect(selectedComment.getByText('Replied to:')).toBeVisible();
        });

        test('hides replied to context for direct children in thread', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();

            const rootComment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Thread root</p>'
            });
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                parent_id: rootComment.id,
                in_reply_to_id: rootComment.id,
                html: '<p>Direct reply to root</p>'
            });

            const commentsPage = new CommentsPage(page);
            await page.goto(`/ghost/#/comments?thread=is:${rootComment.id}`);
            await commentsPage.waitForThreadSidebar();

            const directReply = commentsPage.getThreadCommentByText('Direct reply to root');
            await expect(directReply.getByText('Replied to:')).toBeHidden();
        });
    });
});
