import {
    CommentFactory,
    MemberFactory,
    PostFactory,
    createCommentFactory,
    createMemberFactory,
    createPostFactory
} from '@/data-factory';
import {PostPage} from '@/public-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Public - Comments', () => {
    let commentFactory: CommentFactory;
    let postFactory: PostFactory;
    let memberFactory: MemberFactory;
    let settingsService: SettingsService;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
        memberFactory = createMemberFactory(page.request);
        commentFactory = createCommentFactory(page.request);
        settingsService = new SettingsService(page.request);
    });

    test.beforeEach(async () => {
        await settingsService.setCommentsEnabled('all');
    });

    test('show replies and load more replies', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create({status: 'free'});

        const comment = await commentFactory.create({
            html: 'Test comment 1',
            post_id: post.id,
            member_id: member.id
        });

        const replies = Array.from({length: 5}, (_, index) => {
            return {
                html: `reply ${index + 1} to comment 1`,
                post_id: post.id,
                member_id: member.id,
                parent_id: comment.id
            };
        });

        await commentFactory.createMany(replies);

        const postPage = new PostPage(page);
        await postPage.gotoPost(post.slug);
        await postPage.comments.waitForCommentsToLoad();

        await expect(postPage.comments.comments.last()).toContainText('reply 3 to comment 1');
        await expect(postPage.comments.showMoreRepliesButton).toBeVisible();
        await expect(postPage.comments.showMoreRepliesButton).toContainText('Show 2 more replies');
        await postPage.comments.showMoreRepliesButton.click();
        await expect(postPage.comments.comments.last()).toContainText('reply 5 to comment 1');
    });
});
