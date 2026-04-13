import {MemberFactory, PostFactory, TierFactory, createMemberFactory, createPostFactory, createTierFactory} from '@/data-factory';
import {PostPage} from '@/public-pages';
import {SettingsService} from '@/helpers/services/settings/settings-service';
import {expect, test} from '@/helpers/playwright';
import {signInAsMember} from '@/helpers/playwright/flows/sign-in';

test.describe('Ghost Public - Transistor', () => {
    test.use({labs: {transistor: true}});

    let postFactory: PostFactory;
    let memberFactory: MemberFactory;
    let tierFactory: TierFactory;
    let settingsService: SettingsService;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
        memberFactory = createMemberFactory(page.request);
        tierFactory = createTierFactory(page.request);
        settingsService = new SettingsService(page.request);

        await settingsService.setTransistorEnabled(true);
    });

    test('anonymous visitor - transistor embed is not visible', async ({page}) => {
        const post = await postFactory.createWithCards('transistor', {status: 'published'});

        const postPage = new PostPage(page);
        await postPage.gotoPost(post.slug);

        await expect(postPage.postContent).toContainText('Before transistor');
        await expect(postPage.postContent).toContainText('After transistor');
        await expect(postPage.transistorCard).toBeHidden();
        await expect(postPage.transistorIframe).toBeHidden();
    });

    test('free member - transistor embed is visible', async ({page}) => {
        const post = await postFactory.createWithCards('transistor', {status: 'published'});
        const member = await memberFactory.create({status: 'free'});

        await signInAsMember(page, member);

        const postPage = new PostPage(page);
        await postPage.gotoPost(post.slug);

        await expect(postPage.postContent).toContainText('Before transistor');
        await expect(postPage.postContent).toContainText('After transistor');
        await expect(postPage.transistorIframe).toBeVisible();

        // The data-src should contain the member's UUID (server-side replacement of %7Buuid%7D)
        const dataSrc = await postPage.transistorIframe.getAttribute('data-src');
        expect(dataSrc).not.toContain('%7Buuid%7D');
        expect(dataSrc).toContain(member.uuid);
    });

    test('paid member - transistor embed is visible', async ({page}) => {
        const post = await postFactory.createWithCards('transistor', {status: 'published'});
        const paidTier = await tierFactory.getFirstPaidTier();
        const paidMember = await memberFactory.create({
            status: 'comped',
            tiers: [{id: paidTier.id}]
        });

        await signInAsMember(page, paidMember);

        const postPage = new PostPage(page);
        await postPage.gotoPost(post.slug);

        await expect(postPage.postContent).toContainText('Before transistor');
        await expect(postPage.postContent).toContainText('After transistor');
        await expect(postPage.transistorIframe).toBeVisible();

        const dataSrc = await postPage.transistorIframe.getAttribute('data-src');
        expect(dataSrc).not.toContain('%7Buuid%7D');
        expect(dataSrc).toContain(paidMember.uuid);
    });

    test('preview mode - shows placeholder instead of iframe', async ({page}) => {
        const post = await postFactory.createWithCards('transistor', {status: 'draft'});

        const postPage = new PostPage(page);
        await postPage.goto(`/p/${post.uuid}/?member_status=free`);
        await postPage.waitForPostToLoad();

        await expect(postPage.postContent).toContainText('Before transistor');
        await expect(postPage.postContent).toContainText('After transistor');
        await expect(postPage.transistorPlaceholder).toBeVisible();
        await expect(postPage.transistorPlaceholder).toContainText('Members-only podcasts');
        await expect(postPage.transistorIframe).toBeHidden();
    });
});
