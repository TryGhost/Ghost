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

test.describe('Ghost Public - Comments - Manage', () => {
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

    test('no comment management buttons for non comment author', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const paidTier = await tiersService.getFirstPaidTier();
        const paidMember = await memberFactory.create({status: 'comped', tiers: [{id: paidTier.id}]});
        const anotherPaidMember = await memberFactory.create({status: 'comped', tiers: [{id: paidTier.id}]});

        await commentFactory.create({
            html: 'Comment to edit',
            post_id: post.id,
            member_id: paidMember.id
        });

        await signInAsMember(page, anotherPaidMember);

        const postPage = new PostPage(page);
        const postCommentsSection = postPage.commentsSection;
        await postPage.gotoPost(post.slug);
        await postPage.waitForCommentsToLoad();

        const {
            editCommentButton, deleteCommentButton, hideCommentButton, showCommentButton
        } = await postCommentsSection.getCommentActionButtons('Comment to edit');

        await expect(editCommentButton).toBeHidden();
        await expect(deleteCommentButton).toBeHidden();
        await expect(hideCommentButton).toBeVisible();
        await expect(showCommentButton).toBeHidden();
    });

    test('edit comment', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const paidTier = await tiersService.getFirstPaidTier();
        const paidMember = await memberFactory.create({status: 'comped', tiers: [{id: paidTier.id}]});

        await commentFactory.create({
            html: 'Comment to edit',
            post_id: post.id,
            member_id: paidMember.id
        });

        await signInAsMember(page, paidMember);

        const postPage = new PostPage(page);
        const postCommentsSection = postPage.commentsSection;
        await postPage.gotoPost(post.slug);
        await postPage.waitForCommentsToLoad();

        await postCommentsSection.editComment('Comment to edit', 'Updated comment');
        await expect(postCommentsSection.comments).toHaveCount(1);
        await expect(postCommentsSection.comments.first()).toContainText('Updated comment');
    });

    test('delete comment', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const paidTier = await tiersService.getFirstPaidTier();
        const paidMember = await memberFactory.create({status: 'comped', tiers: [{id: paidTier.id}]});

        await commentFactory.create({
            html: 'First comment',
            post_id: post.id,
            member_id: paidMember.id
        });

        await commentFactory.create({
            html: 'Comment to delete',
            post_id: post.id,
            member_id: paidMember.id
        });

        await signInAsMember(page, paidMember);

        const postPage = new PostPage(page);
        await postPage.gotoPost(post.slug);
        await postPage.waitForCommentsToLoad();
        const postCommentsSection = postPage.commentsSection;

        await postCommentsSection.deleteComment('Comment to delete');
        await expect(postCommentsSection.comments).toHaveCount(1);
        await expect(postCommentsSection.comments.first()).toContainText('First comment');
    });
});
