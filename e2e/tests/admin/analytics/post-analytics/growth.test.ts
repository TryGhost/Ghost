import {
  MembersPage,
  PostAnalyticsGrowthPage,
  PostAnalyticsOverviewPage,
  PostAnalyticsPage,
} from '@/admin-pages';
import { createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';

test.describe('Ghost Admin - Post Analytics - Growth', () => {
  test.beforeEach(async ({ page }) => {
    const postFactory = createPostFactory(page.request);
    const post = await postFactory.create({
      title: 'Post analytics growth test',
      status: 'published',
    });

    const postAnalyticsOverviewPage = new PostAnalyticsOverviewPage(page);
    await postAnalyticsOverviewPage.gotoForPost(post.id);

    // TODO: check post analytics component, we shouldn't need to wait on page load to be able to click growth link
    const postAnalyticsPage = new PostAnalyticsPage(page);
    await postAnalyticsPage.waitForPageLoad();
    await postAnalyticsPage.growthButton.click();
  });

  test('empty members card', async ({ page }) => {
    const postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);

    await expect(postAnalyticsPageGrowthPage.membersCard).toContainText('Free members');
    await expect(postAnalyticsPageGrowthPage.membersCard).toContainText('0');
  });

  test('empty members card - view member', async ({ page }) => {
    const postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);
    await postAnalyticsPageGrowthPage.viewMemberButton.click();

    const membersPage = new MembersPage(page);
    await expect(membersPage.body).toContainText('No matching members found.');
  });

  test('empty top sources card', async ({ page }) => {
    const postAnalyticsPageGrowthPage = new PostAnalyticsGrowthPage(page);

    await expect(postAnalyticsPageGrowthPage.topSourcesCard).toContainText(
      'No sources data available',
    );
  });
});
