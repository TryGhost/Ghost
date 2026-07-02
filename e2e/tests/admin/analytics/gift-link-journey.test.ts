import {AnalyticsWebTrafficPage, PostAnalyticsOverviewPage} from '@/admin-pages';
import {Browser, Page} from '@playwright/test';
import {PublicPage} from '@/public-pages';
import {createPostFactory} from '@/data-factory';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

// Drives the whole gift-link journey through the UI: mint the link from the share
// modal's copy button, then read the gifted post in a fresh browser so the real
// analytics beacon fires. In the analytics project PublicPage.goto waits for the
// page-hit request and the proxy runs with TINYBIRD_WAIT=true, so the visit is
// ingested by the time we return and assert on the admin side.
async function createGiftLinkThenVisit({page, browser, baseURL}: {page: Page; browser: Browser; baseURL?: string}) {
    const postFactory = createPostFactory(page.request);
    const post = await postFactory.create({
        title: 'Gifted paid post',
        status: 'published',
        visibility: 'paid'
    });

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    const overview = new PostAnalyticsOverviewPage(page);
    await overview.gotoForPost(post.id);
    await overview.openShareModal();
    const giftUrl = await overview.copyGiftLinkUrl();

    await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
        const {pathname, search} = new URL(giftUrl);
        await new PublicPage(publicPage).goto(`${pathname}${search}`);
    });

    return {post, overview};
}

test.describe('Ghost Admin - Gift link analytics journey', () => {
    test.use({labs: {giftLinks: true}});

    test('creating a gift link then visiting it - counts the visitor on the post gift-link card', async ({page, browser, baseURL}) => {
        const {overview} = await createGiftLinkThenVisit({page, browser, baseURL});

        // The card fetches its usage once on load, so reload to pull the visit we
        // just recorded — the reload-then-assert guard the other analytics visit
        // tests rely on.
        await overview.refreshData();

        await expect(overview.giftLinkCardVisitors).toHaveText('1');
    });

    test('creating a gift link then visiting it - scopes the web traffic filter to the gift read', async ({page, browser, baseURL}) => {
        await createGiftLinkThenVisit({page, browser, baseURL});

        const webTraffic = new AnalyticsWebTrafficPage(page);
        await webTraffic.goto();
        await webTraffic.openFilterPopover();
        await webTraffic.selectFilterField('Gift link');
        await webTraffic.selectFilterField('used');

        await expect(webTraffic.getActiveFilter('Gift link')).toBeVisible();
        await expect(webTraffic.totalUniqueVisitorsTab).toContainText('1');
    });
});
