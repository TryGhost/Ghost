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
import {TiersService} from '@/helpers/services/tiers/tiers-service';
import {expect, signInAsMember, test} from '@/helpers/playwright';

test.describe('Ghost Public - Comments - Replies', () => {
    let commentFactory: CommentFactory;
    let postFactory: PostFactory;
    let memberFactory: MemberFactory;
    let settingsService: SettingsService;
    let tiersService: TiersService;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
        memberFactory = createMemberFactory(page.request);
        commentFactory = createCommentFactory(page.request);
        settingsService = new SettingsService(page.request);
        tiersService = new TiersService(page.request);
    });

    test.beforeEach(async () => {
        await settingsService.setCommentsEnabled('all');
    });

    test('reply to comment', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create({status: 'free'});
        const paidTier = await tiersService.getFirstPaidTier();
        const paidMember = await memberFactory.create({status: 'comped', tiers: [{id: paidTier.id}]});

        const comment = await commentFactory.create({
            html: 'Main comment',
            post_id: post.id,
            member_id: member.id
        });

        await commentFactory.create({
            html: 'Reply to main comment',
            post_id: post.id,
            member_id: paidMember.id,
            parent_id: comment.id
        });

        await signInAsMember(page, paidMember);

        const postPage = new PostPage(page);
        await postPage.gotoPost(post.slug);
        await postPage.comments.waitForCommentsToLoad();

        await expect(postPage.comments.comments).toHaveCount(2);
        await expect(postPage.comments.comments.first()).toContainText('Main comment');
        await expect(postPage.comments.comments.last()).toContainText('Reply to main comment');

        await postPage.comments.replyToComment('Main comment', 'Reply to main comment 2');
        await expect(postPage.comments.comments).toHaveCount(3);
        await expect(postPage.comments.comments.first()).toContainText('Main comment');
        await expect(postPage.comments.comments.last()).toContainText('Reply to main comment 2');
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

        await expect(postPage.comments.comments).toHaveCount(4);
        await expect(postPage.comments.comments.last()).toContainText('reply 3 to comment 1');
        await expect(postPage.comments.showMoreRepliesButton).toBeVisible();
        await expect(postPage.comments.showMoreRepliesButton).toContainText('Show 2 more replies');

        await postPage.comments.showMoreRepliesButton.click();
        await expect(postPage.comments.comments.last()).toContainText('reply 5 to comment 1');
        await expect(postPage.comments.comments).toHaveCount(6);
    });
});
