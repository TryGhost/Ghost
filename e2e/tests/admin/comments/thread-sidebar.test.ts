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
    let post: Awaited<ReturnType<PostFactory['create']>>;
    let member: Awaited<ReturnType<MemberFactory['create']>>;

    test.use({labs: {commentModeration: true}});

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
        memberFactory = createMemberFactory(page.request);
        commentFactory = createCommentFactory(page.request);

        const settingsService = new SettingsService(page.request);
        [post, member] = await Promise.all([
            postFactory.create({status: 'published'}),
            memberFactory.create(),
            settingsService.setCommentsEnabled('all')
        ]);
    });

    test('can navigate within threads and shows correct replied-to context', async ({page}) => {
        const rootComment = await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: '<p>Root comment</p>'
        });
        const firstReply = await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            parent_id: rootComment.id,
            in_reply_to_id: rootComment.id,
            html: '<p>First level reply</p>'
        });
        const nestedReply = await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            parent_id: rootComment.id,
            in_reply_to_id: firstReply.id,
            html: '<p>Nested reply to first level</p>'
        });

        const commentsPage = new CommentsPage(page);

        // Open thread for root comment — should show root and direct replies
        await page.goto(`/ghost/#/comments?thread=is:${rootComment.id}`);
        await commentsPage.waitForThreadSidebar();
        await expect(commentsPage.threadSidebar.getByText('Root comment')).toBeVisible();
        await expect(commentsPage.threadSidebar.getByText('First level reply', {exact: true})).toBeVisible();

        // Direct children should not show "Replied to:" context
        const directReply = commentsPage.getThreadCommentByText('First level reply');
        await expect(directReply.getByText('Replied to:')).toBeHidden();

        // Click replies metric on first reply to navigate into its sub-thread
        const firstReplyRow = commentsPage.getThreadCommentById(firstReply.id);
        await commentsPage.getRepliesButton(firstReplyRow).click();
        await expect(page).toHaveURL(new RegExp(`thread=is%3A${firstReply.id}`));

        // Sub-thread should show the reply and its children
        await expect(commentsPage.getThreadCommentById(firstReply.id)).toBeVisible();
        await expect(commentsPage.getThreadCommentById(nestedReply.id)).toBeVisible();

        // Thread root (a reply itself) should show "Replied to:" for context
        const threadRoot = commentsPage.getThreadCommentByText('First level reply');
        await expect(threadRoot.getByText('Replied to:')).toBeVisible();
    });

    test('can open threads from the main comment list', async ({page}) => {
        const rootComment = await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: '<p>Comment with replies</p>'
        });
        await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            parent_id: rootComment.id,
            in_reply_to_id: rootComment.id,
            html: '<p>A reply to the comment</p>'
        });

        const commentsPage = new CommentsPage(page);
        await commentsPage.goto();
        await commentsPage.waitForComments();

        // Click replies metric on root comment to open its thread
        const commentRow = commentsPage.commentRows.filter({
            has: page.getByRole('paragraph').filter({hasText: 'Comment with replies'})
        });
        await commentsPage.openThread(commentRow);

        await expect(page).toHaveURL(new RegExp(`thread=is%3A${rootComment.id}`));
        await expect(commentsPage.threadSidebar.getByText('Comment with replies')).toBeVisible();
        await expect(commentsPage.threadSidebar.getByText('A reply to the comment')).toBeVisible();

        // Navigate back to the list to test the "Replied to:" link entry point
        await commentsPage.goto();
        await commentsPage.waitForComments();

        const replyRow = commentsPage.getCommentRowByText('A reply to the comment');
        await commentsPage.getRepliedToLink(replyRow).click();

        await commentsPage.waitForThreadSidebar();
        await expect(page).toHaveURL(new RegExp(`thread=is%3A${rootComment.id}`));
    });

    test('loads more replies when clicking load more button', async ({page}) => {
        const rootComment = await commentFactory.create({
            post_id: post.id,
            member_id: member.id,
            html: '<p>Root comment for pagination test</p>'
        });

        await Promise.all(
            Array.from({length: 5}, (_, i) => commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                parent_id: rootComment.id,
                html: `<p>Reply number ${i + 1}</p>`
            }))
        );

        // Intercept API to set a low limit (3) to trigger pagination
        await page.route('**/ghost/api/admin/comments/**', async (route) => {
            const url = new URL(route.request().url());
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

        await expect(commentsPage.threadSidebar.getByText('Root comment for pagination test')).toBeVisible();

        const threadRows = commentsPage.threadSidebar.getByTestId(/^comment-thread-row-/);
        await expect(threadRows).toHaveCount(4); // 1 root + 3 replies

        const loadMoreButton = commentsPage.threadSidebar.getByRole('button', {name: 'Load more replies'});
        await expect(loadMoreButton).toBeVisible();

        await loadMoreButton.click();

        await expect(threadRows).toHaveCount(6); // 1 root + 5 replies
        await expect(loadMoreButton).toBeHidden();
    });
});
