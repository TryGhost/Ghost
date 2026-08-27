import { PostAnalyticsOverviewPage, PostAnalyticsPage } from '@/admin-pages';
import { SettingsService } from '@/helpers/services/settings/settings-service';
import { createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';

// The family's server journey: the members_track_sources setting round-trips
// through the real settings API and the analytics chrome reacts after reload.
// The pure-rendering variants of these screens live in the admin acceptance
// tier against faked data.
test.describe('Ghost Admin - Post Analytics - Overview', () => {
  test('hides growth after member source tracking is disabled and persisted', async ({ page }) => {
    const postFactory = createPostFactory(page.request);
    const post = await postFactory.create({
      title: 'Post analytics settings journey',
      status: 'published',
    });

    const postAnalyticsOverviewPage = new PostAnalyticsOverviewPage(page);
    await postAnalyticsOverviewPage.gotoForPost(post.id);

    const settingsService = new SettingsService(page.request);
    const postAnalyticsPage = new PostAnalyticsPage(page);

    await expect(postAnalyticsPage.growthButton).toBeVisible();

    try {
      await settingsService.setMembersTrackSources(false);
      await page.reload();

      await expect(postAnalyticsPage.overviewButton).toBeVisible();
      await expect(postAnalyticsPage.growthButton).toBeHidden();
    } finally {
      await settingsService.setMembersTrackSources(true);
      await page.reload();
      await expect(postAnalyticsPage.growthButton).toBeVisible();
    }
  });
});
