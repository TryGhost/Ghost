import {test, expect, withIsolatedPage} from '../../../helpers/playwright';
import {AnalyticsGrowthPage} from '../../../helpers/pages/admin';
import {signupViaPortal} from '../../../helpers/playwright/flows/signup';
import {HomePage, PublicPage} from '../../../helpers/pages/public';
import {extractMagicLink} from '../../../helpers/services/email/utils';
import {EmailClient, MailhogClient} from '../../../helpers/services/email/MailhogClient';
import {EmailMessageBody} from '../../../helpers/services/email/EmailMessageBody';

test.describe('Ghost Admin - Growth', () => {
    let emailClient: EmailClient;
    let growthPage: AnalyticsGrowthPage;

    test.beforeEach(async ({page}) => {
        emailClient = new MailhogClient();
        growthPage = new AnalyticsGrowthPage(page);
        await growthPage.goto();
    });

    test('empty top content card - posts and pages', async () => {
        await expect(growthPage.topContent.contentCard).toContainText('Which posts or pages drove the most growth in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });

    test('empty top content card - posts', async () => {
        await growthPage.topContent.postsButton.click();

        await expect(growthPage.topContent.contentCard).toContainText('Which posts drove the most growth in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });

    test('empty top content card - pages', async () => {
        await growthPage.topContent.pagesButton.click();

        await expect(growthPage.topContent.contentCard).toContainText('Which pages drove the most growth in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });

    test('empty top content card - sources', async () => {
        await growthPage.topContent.sourcesButton.click();

        await expect(growthPage.topContent.contentCard).toContainText('How readers found your site in the last 30 days');
        await expect(growthPage.topContent.contentCard).toContainText('No conversions');
    });

    test.describe('Campaigns', function () {
        test.use({labs: {utmTracking: true}});

        test('empty top content card - campaigns', async () => {
            await growthPage.topContent.openCampaignsDropdown();
            await growthPage.topContent.selectCampaignType('UTM campaigns');
            await expect(growthPage.topContent.contentCard).toContainText('Which campaigns drove the most growth in the last 30 days');
            await expect(growthPage.topContent.contentCard).toContainText('No conversions');
        });

        test('records free members when UTM campaign is set', async ({browser}) => {
            const utmCampaign = 'spring-sale';

            // Create a new member via portal with UTM campaign set
            await withIsolatedPage(browser, {}, async ({page: publicPage}) => {
                const homePage = new HomePage(publicPage);
                await homePage.goto(`/?utm_campaign=${utmCampaign}`);
                const {emailAddress} = await signupViaPortal(publicPage);

                const message = await emailClient.waitForEmail(emailAddress);
                const emailMessageBodyParts = new EmailMessageBody(message);
                const emailTextBody = emailMessageBodyParts.getTextContent();

                const magicLink = extractMagicLink(emailTextBody);
                await publicPage.goto(magicLink);
                await expect(homePage.accountButton).toBeVisible();
            });

            // Verify that the member appears in the top content card
            await growthPage.goto();
            await growthPage.topContent.openCampaignsDropdown();
            await growthPage.topContent.selectCampaignType('UTM campaigns');
            await expect(growthPage.topContent.contentCard).toContainText('Which campaigns drove the most growth in the last 30 days');
            await expect(growthPage.topContent.topContentRows).toHaveCount(1);
            await expect(growthPage.topContent.topContentRows.first()).toContainText(`${utmCampaign}+1`);
        });
    });
});
