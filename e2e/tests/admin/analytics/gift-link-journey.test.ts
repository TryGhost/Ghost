import {AnalyticsWebTrafficPage, PostAnalyticsOverviewPage} from '@/admin-pages';
import {PublicPage} from '@/public-pages';
import {createPostFactory} from '@/data-factory';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';

// One journey, asserted on every surface it feeds: mint the link in the share
// modal, read the gifted post in a fresh browser so the real analytics beacon
// fires (in the analytics project PublicPage.goto waits for the page-hit request
// and the proxy ingests synchronously), then check the admin side.
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
        await overview.openShareModal();
        const giftUrl = await overview.giftLinkUrl();

        await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
            const {pathname, search} = new URL(giftUrl);
            await new PublicPage(publicPage).goto(`${pathname}${search}`);
        });
        // The overview fetches gift-link usage once on load; reload to pull the
        // visit we just recorded.
        await overview.refresh();

        await expect(overview.giftLinkCardVisitors).toHaveText('1');

        await overview.openShareModal();
        await expect(overview.giftLinkVisitorsBadge).toHaveText('1 visitor');

        const webTraffic = new AnalyticsWebTrafficPage(page);
        await webTraffic.goto();
        await webTraffic.addFilter('Gift link', 'used');

        await expect(webTraffic.getActiveFilter('Gift link')).toBeVisible();
        await expect(webTraffic.totalUniqueVisitorsTab).toHaveText(/^Unique visitors\s*1$/);
    });
});
