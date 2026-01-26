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

test.describe('Ghost Admin - Comment Moderation', () => {
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

    test.describe('with commentPermalinks disabled', () => {
        test.use({
            labs: {commentModeration: true, commentPermalinks: false}
        });

        test('view post action navigates to post', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Test comment without permalink</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText(
                'Test comment without permalink'
            );
            await commentsPage.openMoreMenu(commentRow);

            const popupPromise = page.waitForEvent('popup');
            await commentsPage.getViewPostMenuItem().click();
            const postPage = await popupPromise;

            await expect(postPage).toHaveURL(new RegExp(`/${post.slug}/`));
            expect(postPage.url()).not.toContain('#ghost-comments-');
        });
    });

    test.describe('with commentPermalinks enabled', () => {
        test.use({
            labs: {commentModeration: true, commentPermalinks: true}
        });

        test('view on post action navigates to comment permalink', async ({
            page
        }) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();
            const comment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>Test comment with permalink</p>'
            });

            const commentsPage = new CommentsPage(page);
            await commentsPage.goto();
            await commentsPage.waitForComments();

            const commentRow = commentsPage.getCommentRowByText(
                'Test comment with permalink'
            );
            await commentsPage.openMoreMenu(commentRow);

            const popupPromise = page.waitForEvent('popup');
            await commentsPage.getViewOnPostMenuItem().click();
            const postPage = await popupPromise;

            await expect(postPage).toHaveURL(
                new RegExp(`/${post.slug}/.*#ghost-comments-${comment.id}`)
            );
        });
    });

    test.describe('deep linking', () => {
        test.use({labs: {commentModeration: true}});

        test('can deep link to a specific comment by id', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create();

            // Create target comment and another comment
            const targetComment = await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>This is the target comment</p>'
            });
            await commentFactory.create({
                post_id: post.id,
                member_id: member.id,
                html: '<p>This is another comment</p>'
            });

            const commentsPage = new CommentsPage(page);
            await page.goto(`/ghost/#/comments?id=is:${targetComment.id}`);
            await commentsPage.waitForComments();

            await expect(
                commentsPage.getCommentRowByText('This is the target comment')
            ).toBeVisible();
            await expect(
                commentsPage.getCommentRowByText('This is another comment')
            ).toBeHidden();

            await expect(
                page.getByRole('button', {name: 'Filter'})
            ).toBeHidden();

            const showAllButton = page.getByRole('button', {
                name: 'Show all comments'
            });
            await expect(showAllButton).toBeVisible();

            await showAllButton.click();
            await expect(
                commentsPage.getCommentRowByText('This is the target comment')
            ).toBeVisible();
            await expect(
                commentsPage.getCommentRowByText('This is another comment')
            ).toBeVisible();

            await expect(
                page.getByRole('button', {name: 'Filter'})
            ).toBeVisible();
            await expect(showAllButton).toBeHidden();
        });
    });
});
