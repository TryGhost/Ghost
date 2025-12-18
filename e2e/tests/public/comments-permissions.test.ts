import {MemberFactory, PostFactory, createMemberFactory, createPostFactory} from '@/data-factory';
import {PostPage} from '@/public-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {TiersService} from '@/helpers/services/tiers/tiers-service';
import {expect, test} from '@/helpers/playwright';
import {signInAsMember} from '@/helpers/playwright/flows/sign-in';

test.describe('Ghost Public - Comments', () => {
    let postFactory: PostFactory;
    let memberFactory: MemberFactory;
    let settingsService: SettingsService;
    let tiersService: TiersService;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
        memberFactory = createMemberFactory(page.request);
        settingsService = new SettingsService(page.request);
        tiersService = new TiersService(page.request);
    });

    test.describe('comments enabled for all members', () => {
        test.beforeEach(async () => {
            await settingsService.setCommentsEnabled('all');
        });

        test('anonymous user - can not add a comment', async ({page}) => {
            const post = await postFactory.create({status: 'published'});

            const postPage = new PostPage(page);
            await postPage.gotoPost(post.slug);
            await postPage.comments.waitForCommentsToLoad();

            await expect(postPage.comments.ctaBox).toBeVisible();
            await expect(postPage.comments.signUpButton).toBeVisible();
            await expect(postPage.comments.signInButton).toBeVisible();
            await expect(postPage.comments.mainForm).toBeHidden();
        });

        test('free member - can add a comment', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const freeMember = await memberFactory.create({status: 'free'});
            const commentTexts = ['Test comment by free member', 'Another Test comment by free member'];

            await signInAsMember(page, freeMember);
            const postPage = new PostPage(page);
            await postPage.gotoPost(post.slug);
            await postPage.comments.waitForCommentsToLoad();
            await postPage.comments.addComment(commentTexts[0]);
            await postPage.comments.addComment(commentTexts[1]);

            await expect(postPage.comments.mainForm).toBeVisible();
            await expect(postPage.comments.ctaBox).toBeHidden();

            // assert comment details
            await expect(postPage.comments.commentCountText).toHaveText('2 comments');
            await expect(postPage.comments.comments).toHaveCount(2);
            await expect(postPage.comments.comments.first()).toContainText(commentTexts[1]);
            await expect(postPage.comments.comments.last()).toContainText(commentTexts[0]);
        });

        test('paid member - can add a comment', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const paidTier = await tiersService.getFirstPaidTier();
            const paidMember = await memberFactory.create({status: 'comped', tiers: [{id: paidTier.id}]});
            const commentText = 'This is a test comment from a paid member';

            await signInAsMember(page, paidMember);
            const postPage = new PostPage(page);
            await postPage.gotoPost(post.slug);
            await postPage.waitForPostToLoad();
            await postPage.comments.waitForCommentsToLoad();
            await postPage.comments.addComment(commentText);

            await expect(postPage.comments.mainForm).toBeVisible();
            await expect(postPage.comments.ctaBox).toBeHidden();

            // assert comment details
            await expect(postPage.comments.comments).toHaveCount(1);
            await expect(postPage.comments.comments.first()).toContainText(commentText);
        });
    });

    test.describe('comments enabled for paid members only', () => {
        test.beforeEach(async () => {
            await settingsService.setCommentsEnabled('paid');
        });

        test('free member - can not add a comment', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const member = await memberFactory.create({status: 'free'});

            await signInAsMember(page, member);
            const postPage = new PostPage(page);
            await postPage.gotoPost(post.slug);
            await postPage.waitForPostToLoad();
            await postPage.comments.waitForCommentsToLoad();

            await expect(postPage.comments.ctaBox).toBeVisible();
            await expect(postPage.comments.mainForm).toBeHidden();
        });

        test('paid member - can add a comment', async ({page}) => {
            const post = await postFactory.create({status: 'published'});
            const paidTier = await tiersService.getFirstPaidTier();
            const member = await memberFactory.create({status: 'comped', tiers: [{id: paidTier.id}]});
            const commentText = 'This is a test comment from a paid member';

            await signInAsMember(page, member);
            const postPage = new PostPage(page);
            await postPage.gotoPost(post.slug);
            await postPage.waitForPostToLoad();
            await postPage.comments.waitForCommentsToLoad();
            await postPage.comments.addComment(commentText);

            await expect(postPage.comments.mainForm).toBeVisible();
            await expect(postPage.comments.ctaBox).toBeHidden();

            await expect(postPage.comments.comments.first()).toContainText(commentText);
        });
    });

    test.describe('comments disabled', () => {
        test.beforeEach(async () => {
            await settingsService.setCommentsEnabled('off');
        });

        test('comments section is not visible', async ({page}) => {
            const post = await postFactory.create({status: 'published'});

            const postPage = new PostPage(page);
            await postPage.gotoPost(post.slug);
            await postPage.waitForPostToLoad();

            await expect(postPage.comments.commentsIframe).toBeHidden();
        });
    });
});
