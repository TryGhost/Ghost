import {
    CommentFactory,
    MemberFactory,
    PostFactory,
    createFactories
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
        ({postFactory, memberFactory, commentFactory} = createFactories(page.request));
        settingsService = new SettingsService(page.request);
        tiersService = new TiersService(page.request);
    });

    test.beforeEach(async () => {
        await settingsService.setCommentsEnabled('all');
    });

    test('reply to top comment', async ({page}) => {
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
        await postPage.waitForCommentsToLoad();
        const postCommentsSection = postPage.commentsSection;

        await expect(postCommentsSection.comments).toHaveCount(2);
        await expect(postCommentsSection.comments.first()).toContainText('Main comment');
        await expect(postCommentsSection.comments.last()).toContainText('Reply to main comment');

        await postCommentsSection.replyToComment('Main comment', 'Reply to main comment 2');
        await expect(postCommentsSection.comments).toHaveCount(3);
        await expect(postCommentsSection.comments.first()).toContainText('Main comment');
        await expect(postCommentsSection.comments.last()).toContainText('Reply to main comment 2');
    });

    test('reply to reply comment', async ({page}) => {
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
        await postPage.waitForCommentsToLoad();
        const postCommentsSection = postPage.commentsSection;

        await postCommentsSection.replyToComment('Reply to main comment', 'My reply');
        await expect(postCommentsSection.comments).toHaveCount(3);
        await expect(postCommentsSection.comments.first()).toContainText('Main comment');
        await expect(postCommentsSection.comments.last()).toContainText('My reply');
        await expect(postCommentsSection.comments.last()).toContainText('Replied to: Reply to main comment');
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
        await postPage.waitForCommentsToLoad();
        const postCommentsSection = postPage.commentsSection;

        await expect(postCommentsSection.comments).toHaveCount(4);
        await expect(postCommentsSection.comments.last()).toContainText('reply 3 to comment 1');
        await expect(postCommentsSection.showMoreRepliesButton).toBeVisible();
        await expect(postCommentsSection.showMoreRepliesButton).toContainText('Show 2 more replies');

        await postCommentsSection.showMoreRepliesButton.click();
        await expect(postCommentsSection.comments.last()).toContainText('reply 5 to comment 1');
        await expect(postCommentsSection.comments).toHaveCount(6);
    });
});
