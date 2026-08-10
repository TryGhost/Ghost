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

// Deep-link filtering and the thread sidebar are covered by
// apps/admin/src/comments/comments.acceptance.test.tsx.
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

    test.describe('view on post', () => {
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
            await commentsPage.viewOnPostMenuItem.click();
            const postPage = await popupPromise;

            await expect(postPage).toHaveURL(
                new RegExp(`/${post.slug}/.*#ghost-comments-${comment.id}`)
            );
        });
    });
});
