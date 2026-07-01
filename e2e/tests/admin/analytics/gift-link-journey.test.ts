import {AnalyticsWebTrafficPage, PostAnalyticsOverviewPage} from '@/admin-pages';
import {Browser, Page} from '@playwright/test';
import {PublicPage} from '@/public-pages';
import {createPostFactory} from '@/data-factory';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

// The full journey (public gift read → ghost-stats beacon → TrafficAnalytics proxy
// → Tinybird → admin count) only works once the proxy carries gift_link
// (TryGhost/TrafficAnalytics#742) and the analytics-lane image is bumped to include
// it. Until then the pinned proxy drops gift_link; flip this on to enable.
const GIFT_LINK_PROXY_READY = process.env.GIFT_LINK_PROXY_READY === 'true';

async function recordGiftVisit({page, browser, baseURL}: {page: Page; browser: Browser; baseURL?: string}) {
    const postFactory = createPostFactory(page.request);
    const post = await postFactory.create({
        title: 'Gifted paid post',
        status: 'published',
        visibility: 'paid'
    });

    const response = await page.request.put(`/ghost/api/admin/posts/${post.id}/gift_links`);
    const {gift_links: giftLinks} = await response.json();
    const token = giftLinks[0].token;

    // Visiting in an isolated context fires the real beacon; in the analytics
    // project PublicPage.goto waits for the page-hit request to complete, and the
    // proxy runs with TINYBIRD_WAIT=true, so the hit is ingested before we assert.
    await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
        const giftReadPage = new PublicPage(publicPage);
        await giftReadPage.goto(`/${post.slug}/?gift=${encodeURIComponent(token)}`);
    });

    return {post, token};
}

test.describe('Ghost Admin - Gift link analytics journey', () => {
    test.use({labs: {giftLinks: true}});

    test.beforeEach(() => {
        test.skip(!GIFT_LINK_PROXY_READY, 'Requires gift_link passthrough in the analytics proxy (TryGhost/TrafficAnalytics#742) + the compose image bump');
    });

    test('visiting a gift link - records one visitor on the per-link count', async ({page, browser, baseURL}) => {
        const {post} = await recordGiftVisit({page, browser, baseURL});

        const overview = new PostAnalyticsOverviewPage(page);
        await overview.gotoForPost(post.id);
        await overview.openShareModal();

        await expect(overview.giftLinkVisitorsBadge).toHaveText('1 visitor');
    });

    test('filtering web traffic by gift link - scopes visitors to the gift read', async ({page, browser, baseURL}) => {
        await recordGiftVisit({page, browser, baseURL});

        const webTraffic = new AnalyticsWebTrafficPage(page);
        await webTraffic.goto();
        await webTraffic.openFilterPopover();
        await webTraffic.selectFilterField('Gift link');
        await webTraffic.selectFilterField('used');

        await expect(webTraffic.getActiveFilter('Gift link')).toBeVisible();
        await expect(webTraffic.totalUniqueVisitorsTab).toContainText('1');
    });
});
