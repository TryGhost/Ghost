import {test, expect} from '../../../../helpers/playwright';
import {
    AnalyticsOverviewPage,
    PostAnalyticsPage,
    PostAnalyticsGrowthPage,
    MembersPage
} from '../../../../helpers/pages/admin';
import {withIsolatedPage} from '../../../../helpers/playwright';
import {extractMagicLink} from '../../../../helpers/services/email/utils';
import {signupViaPortal} from '../../../../helpers/playwright/flows/signup';
import {HomePage} from '../../../../helpers/pages/public';
import {EmailClient, MailPit} from '../../../../helpers/services/email/MailPit';
import {createPostFactory} from '../../../../data-factory';

test.describe('Ghost Admin - Post Analytics - Growth', () => {
    const emailClient: EmailClient = new MailPit();

    test.beforeEach(async ({page}) => {
        const analyticsOverviewPage = new AnalyticsOverviewPage(page);
        await analyticsOverviewPage.goto();
        await analyticsOverviewPage.latestPost.analyticsButton.click();

        // TODO: check post analytics component, we shouldn't need to wait on page load to be able to click growth link
        const postAnalyticsPage = new PostAnalyticsPage(page);
        await postAnalyticsPage.waitForPageLoad();
        await postAnalyticsPage.growthButton.click();
    });

    test('empty members card', async ({page}) => {
        const postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);

        await expect(postAnalyticsPageGrowthPage.membersCard).toContainText('Free members');
        await expect(postAnalyticsPageGrowthPage.membersCard).toContainText('0');
    });

    test('empty members card - view member', async ({page}) => {
        const postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);
        await postAnalyticsPageGrowthPage.viewMemberButton.click();

        const membersPage = new MembersPage(page);
        await expect(membersPage.body).toContainText('No members match');
    });

    test('empty top sources card', async ({page}) => {
        const postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);

        await expect(postAnalyticsPageGrowthPage.topContent.sourcesButton).not.toBeVisible();
        await expect(postAnalyticsPageGrowthPage.topContent.campaignsDropdown).not.toBeVisible();
        await expect(postAnalyticsPageGrowthPage.topSourcesCard).toContainText('No sources data available');
    });

    test.describe('Campaigns', function () {
        test.use({labs: {utmTracking: true}});

        test('empty state top sources card - with UTM tracking enabled', async ({page}) => {
            const postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);

            await expect(postAnalyticsPageGrowthPage.topContent.sourcesButton).not.toBeVisible();
            await expect(postAnalyticsPageGrowthPage.topContent.campaignsDropdown).not.toBeVisible();
            await expect(postAnalyticsPageGrowthPage.topSourcesCard).toContainText('No sources data available');
        });

        test('attributes free members to UTM Campaigns', async ({page, browser}) => {
            const utmCampaign = 'spring-sale';

            const postFactory = createPostFactory(page.request);
            const post = await postFactory.create({
                title: 'UTM Campaign Test Post',
                status: 'published'
            });

            // Create a new member via portal with UTM campaign set on the specific post
            await withIsolatedPage(browser, {}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto(`/${post.slug}?utm_campaign=${utmCampaign}`);
                const {emailAddress} = await signupViaPortal(publicPage);

                const messages = await emailClient.searchByRecipient(emailAddress);
                const message = await emailClient.getMessageDetailed(messages[0]);
                const emailTextBody = message.Text;

                const magicLink = extractMagicLink(emailTextBody);
                await publicPage.goto(magicLink);
                await expect(homePage.accountButton).toBeVisible();
            });

            // Verify that the member appears in the campaigns view for this specific post
            const postAnalyticsGrowthPage = new PostAnalyticsGrowthPage(page);
            await postAnalyticsGrowthPage.goto(`/ghost/#/posts/analytics/${post.id}/growth`);
            await postAnalyticsGrowthPage.topContent.openCampaignsDropdown();
            await postAnalyticsGrowthPage.topContent.selectCampaignType('UTM campaigns');

            await expect(postAnalyticsGrowthPage.topContent.contentCard).toContainText('UTM campaigns');
            await expect(postAnalyticsGrowthPage.topContent.contentCard).toContainText('Where did your growth come from?');
            await expect(postAnalyticsGrowthPage.topContent.topContentRows).toHaveCount(1);
            await expect(postAnalyticsGrowthPage.topContent.topContentRows.first()).toContainText(utmCampaign);
            await expect(postAnalyticsGrowthPage.topContent.topContentRows.first()).toContainText('+1');
        });
    });
});

