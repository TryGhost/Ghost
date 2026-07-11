import {AnalyticsWebTrafficPage, PostAnalyticsOverviewPage} from '@/admin-pages';
import {PublicPage} from '@/public-pages';
import {createPostFactory} from '@/data-factory';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

// One journey, asserted on every surface it feeds: check the blank states, mint
// the link in the share modal, read the gifted post in a fresh browser so the
// real analytics beacon fires (in the analytics project PublicPage.goto waits
// for the page-hit request and the proxy ingests synchronously), then verify
// each count went from zero to one.
test.describe('Ghost Admin - Gift link analytics journey', () => {
    test('creating a gift link then visiting it - counts the visitor across analytics surfaces', async ({page, browser, baseURL}) => {
        const postFactory = createPostFactory(page.request);
        const post = await postFactory.create({
            title: 'Gifted paid post',
            status: 'published',
            visibility: 'paid'
        });

        const overview = new PostAnalyticsOverviewPage(page);
        await overview.gotoForPost(post.id);
        await expect(overview.giftLinkCardVisitors).toHaveText('0');

        await overview.openShareModal();
        await expect(overview.giftLinkVisitorsBadge).toHaveText('No visitors yet');
        const giftUrl = await overview.giftLinkUrl();

        const webTraffic = new AnalyticsWebTrafficPage(page);
        await webTraffic.goto();
        await webTraffic.addFilter('Gift link', 'used');
        await expect(webTraffic.getActiveFilter('Gift link')).toBeVisible();
        await expect(webTraffic.totalUniqueVisitorsTab).toHaveText(/^Unique visitors\s*0$/);

        await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
            const {pathname, search} = new URL(giftUrl);
            await new PublicPage(publicPage).goto(`${pathname}${search}`);
        });
        // The filter persists in the URL, so reloading re-queries the same
        // gift-scoped view against the freshly ingested visit.
        await webTraffic.refresh();

        await expect(webTraffic.getActiveFilter('Gift link')).toBeVisible();
        await expect(webTraffic.totalUniqueVisitorsTab).toHaveText(/^Unique visitors\s*1$/);

        await overview.gotoForPost(post.id);
        await expect(overview.giftLinkCardVisitors).toHaveText('1');

        await overview.openShareModal();
        await expect(overview.giftLinkVisitorsBadge).toHaveText('1 visitor');
    });
});
