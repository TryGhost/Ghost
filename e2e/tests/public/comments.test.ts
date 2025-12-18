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
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Public - Comments', () => {
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

    test('sort comments', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create({status: 'free'});
        const paidTier = await tiersService.getFirstPaidTier();
        const paidMember = await memberFactory.create({status: 'comped', tiers: [{id: paidTier.id}]});

        const comments = Array.from({length: 25}, (_, index) => {
            return {
                html: `Test comment ${index + 1}`,
                post_id: post.id,
                member_id: Math.random() > 0.5 ? member.id : paidMember.id,
                created_at: new Date(Date.now() - index * 1000).toISOString()
            };
        });

        await commentFactory.createMany(comments);

        const postPage = new PostPage(page);
        await postPage.gotoPost(post.slug);
        await postPage.comments.waitForCommentsToLoad();

        // verify sorting by oldest comments and load more comments
        await postPage.comments.sortBy('Oldest');
        await expect(postPage.comments.sortingButton).toContainText('Oldest');
        await expect(postPage.comments.comments.first()).toContainText('Test comment 25');
        await expect(postPage.comments.comments.last()).toContainText('Test comment 6');
        await expect(postPage.comments.showMoreCommentsButton).toBeVisible();
        await expect(postPage.comments.showMoreCommentsButton).toContainText('Load more (5)');

        await postPage.comments.showMoreCommentsButton.click();
        await expect(postPage.comments.comments).toHaveCount(25);
        await expect(postPage.comments.comments.last()).toContainText('Test comment 1');

        // verify sorting by newest comments and load more comments
        await postPage.comments.sortBy('Newest');
        await expect(postPage.comments.sortingButton).toContainText('Newest');
        await expect(postPage.comments.comments.first()).toContainText('Test comment 1');
        await expect(postPage.comments.comments.last()).toContainText('Test comment 20');
        await expect(postPage.comments.showMoreCommentsButton).toBeVisible();
        await expect(postPage.comments.showMoreCommentsButton).toContainText('Load more (5)');

        await postPage.comments.showMoreCommentsButton.click();
        await expect(postPage.comments.comments).toHaveCount(25);
        await expect(postPage.comments.comments.last()).toContainText('Test comment 25');
    });

    test('show more comments', async ({page}) => {
        const post = await postFactory.create({status: 'published'});
        const member = await memberFactory.create({status: 'free'});

        const comments = Array.from({length: 25}, (_, index) => {
            return {
                html: `Test comment ${index + 1}`,
                post_id: post.id,
                member_id: member.id,
                created_at: new Date(Date.now() - index * 1000).toISOString()
            };
        });

        await commentFactory.createMany(comments);

        const postPage = new PostPage(page);
        await postPage.gotoPost(post.slug);
        await postPage.comments.waitForCommentsToLoad();

        await expect(postPage.comments.sortingButton).toContainText('Best');
        await expect(postPage.comments.comments.last()).toContainText('Test comment 20');
        await expect(postPage.comments.showMoreCommentsButton).toBeVisible();
        await expect(postPage.comments.showMoreCommentsButton).toContainText('Load more (5)');

        await postPage.comments.showMoreCommentsButton.click();
        await expect(postPage.comments.comments).toHaveCount(25);
        await expect(postPage.comments.comments.last()).toContainText('Test comment 25');
    });
});
