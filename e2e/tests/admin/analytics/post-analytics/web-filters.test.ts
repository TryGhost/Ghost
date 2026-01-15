import {PostAnalyticsWebTrafficPage} from '@/admin-pages';
import {PublicPage} from '@/public-pages';
import {createPostFactory} from '@/data-factory';
import {expect, test, withIsolatedPage} from '@/helpers/playwright';
import type {PostFactory} from '@/data-factory';

test.describe('Ghost Admin - Post Analytics Web Filters', () => {
    let postFactory: PostFactory;
    let postId: string;
    let postSlug: string;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);

        const post = await postFactory.create({
            title: 'Test Post for Analytics Filters',
            status: 'published'
        });

        postId = post.id;
        postSlug = post.slug;
    });

    test.describe('utmTracking flag explicitly disabled', () => {
        test.use({labs: {utmTracking: false}});

        test('filter ui hidden when flag disabled', async ({page}) => {
            const postAnalyticsPage = new PostAnalyticsWebTrafficPage(page);
            await postAnalyticsPage.gotoForPost(postId);

            await expect(postAnalyticsPage.filterContainer).toBeHidden();
        });
    });

    test.describe('utmTracking enabled by default', () => {
        test('filter ui visible when flag enabled', async ({page, browser, baseURL}) => {
            // Generate traffic to the post
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const postPage = new PublicPage(publicPage);
                await postPage.goto(`/${postSlug}/`);
            });

            const postAnalyticsPage = new PostAnalyticsWebTrafficPage(page);
            await postAnalyticsPage.gotoForPost(postId);

            await expect(postAnalyticsPage.filterContainer).toBeVisible();
            await expect(postAnalyticsPage.filterButton).toBeVisible();
        });

        test('filter popover shows available filter fields', async ({page, browser, baseURL}) => {
            // Generate traffic to the post
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const postPage = new PublicPage(publicPage);
                await postPage.goto(`/${postSlug}/`);
            });

            const postAnalyticsPage = new PostAnalyticsWebTrafficPage(page);
            await postAnalyticsPage.gotoForPost(postId);
            await postAnalyticsPage.openFilterPopover();

            await expect(postAnalyticsPage.getFilterOption('Audience')).toBeVisible();
            await expect(postAnalyticsPage.getFilterOption('Source')).toBeVisible();
            await expect(postAnalyticsPage.getFilterOption('Device')).toBeVisible();
            await expect(postAnalyticsPage.getFilterOption('Location')).toBeVisible();
            await expect(postAnalyticsPage.getFilterOption('UTM Source')).toBeVisible();
            await expect(postAnalyticsPage.getFilterOption('UTM Medium')).toBeVisible();
            await expect(postAnalyticsPage.getFilterOption('UTM Campaign')).toBeVisible();
        });

        test('selecting filter field shows value options with visit counts', async ({page, browser, baseURL}) => {
            // Generate traffic to the post
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const postPage = new PublicPage(publicPage);
                await postPage.goto(`/${postSlug}/`);
            });

            const postAnalyticsPage = new PostAnalyticsWebTrafficPage(page);
            await postAnalyticsPage.gotoForPost(postId);
            await postAnalyticsPage.openFilterPopover();
            await postAnalyticsPage.selectFilterField('Source');

            const directOption = postAnalyticsPage.getFilterOptionValue('Direct');
            await expect(directOption).toBeVisible();
            await expect(directOption).toContainText(/\d+/);
        });

        test('click on source row adds source filter', async ({page, browser, baseURL}) => {
            // Generate traffic to the post
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const postPage = new PublicPage(publicPage);
                await postPage.goto(`/${postSlug}/`);
            });

            const postAnalyticsPage = new PostAnalyticsWebTrafficPage(page);
            await postAnalyticsPage.gotoForPost(postId);
            await expect(postAnalyticsPage.topSourcesCard).toContainText('Direct');

            await postAnalyticsPage.clickSourceToFilter('direct');

            await expect(postAnalyticsPage.getActiveFilter('Source')).toBeVisible();
        });

        test('filter persists in url', async ({page, browser, baseURL}) => {
            // Generate traffic to the post
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const postPage = new PublicPage(publicPage);
                await postPage.goto(`/${postSlug}/`);
            });

            const postAnalyticsPage = new PostAnalyticsWebTrafficPage(page);
            await postAnalyticsPage.gotoForPost(postId);
            await expect(postAnalyticsPage.topSourcesCard).toContainText('Direct');

            await postAnalyticsPage.clickSourceToFilter('direct');

            expect(postAnalyticsPage.getSearchParams().has('source')).toBe(true);
        });

        test('can remove filter', async ({page, browser, baseURL}) => {
            // Generate traffic to the post
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const postPage = new PublicPage(publicPage);
                await postPage.goto(`/${postSlug}/`);
            });

            const postAnalyticsPage = new PostAnalyticsWebTrafficPage(page);
            await postAnalyticsPage.gotoForPost(postId);
            await expect(postAnalyticsPage.topSourcesCard).toContainText('Direct');

            await postAnalyticsPage.clickSourceToFilter('direct');
            await expect(postAnalyticsPage.getActiveFilter('Source')).toBeVisible();

            await postAnalyticsPage.removeFilter('Source');

            await expect(postAnalyticsPage.getActiveFilter('Source')).toBeHidden();
        });

        // TODO: This is flaky on CI, so we're skipping it for now.
        test.skip('click on location row adds location filter', async ({page, browser, baseURL}) => {
            // Generate traffic to the post
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const postPage = new PublicPage(publicPage);
                await postPage.goto(`/${postSlug}/`);
            });

            const postAnalyticsPage = new PostAnalyticsWebTrafficPage(page);
            await postAnalyticsPage.gotoForPost(postId);

            // Wait for locations card to show data with at least one row
            await expect(postAnalyticsPage.locationsCard).toBeVisible();
            await expect(postAnalyticsPage.getFirstLocationRow()).toBeVisible();

            // Click the first location row (actual location code varies by environment)
            await postAnalyticsPage.clickFirstLocationRow();

            await expect(postAnalyticsPage.getActiveFilter('Location')).toBeVisible();
        });

        test('applied filter is hidden from dropdown', async ({page, browser, baseURL}) => {
            // Generate traffic to the post
            await withIsolatedPage(browser, {baseURL}, async ({page: publicPage}) => {
                const postPage = new PublicPage(publicPage);
                await postPage.goto(`/${postSlug}/`);
            });

            const postAnalyticsPage = new PostAnalyticsWebTrafficPage(page);
            await postAnalyticsPage.gotoForPost(postId);
            await expect(postAnalyticsPage.topSourcesCard).toContainText('Direct');

            // Apply source filter
            await postAnalyticsPage.clickSourceToFilter('direct');
            await expect(postAnalyticsPage.getActiveFilter('Source')).toBeVisible();

            // Open filter dropdown and verify Source is no longer available
            await postAnalyticsPage.openFilterPopover();
            await expect(postAnalyticsPage.getFilterOption('Audience')).toBeVisible();
            await expect(postAnalyticsPage.getFilterOption('Source')).toBeHidden();
            await expect(postAnalyticsPage.getFilterOption('Location')).toBeVisible();
        });
    });
});
