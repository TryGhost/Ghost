import { HomePage } from '@/public-pages';
import { SettingsService } from '@/helpers/services/settings/settings-service';
import { expect, test } from '@/helpers/playwright';

// The announcement bar is rendered by `{{ghost_head}}` and put in place by a
// short inline bootstrap. Which audience sees it is covered by unit tests on the
// helper; what needs a real browser is the bootstrap: where the bar lands, that
// it gets there without a network round trip, that dismissal sticks, and that an
// announcement can't escape the bar it belongs to.
test.describe('Ghost Public - Announcement bar', () => {
  let settingsService: SettingsService;

  test.beforeEach(async ({ page }) => {
    settingsService = new SettingsService(page.request);
  });

  test.afterEach(async () => {
    await settingsService.setAnnouncement({ content: '', audience: [] });
  });

  test('is in the page for a visitor in the audience, with no extra requests', async ({ page }) => {
    await settingsService.setAnnouncement({
      content: '<p>Sale <strong>today</strong></p>',
      audience: ['visitors'],
    });

    const announcementRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('announcement')) {
        announcementRequests.push(request.url());
      }
    });

    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.announcementBar).toBeVisible();
    await expect(homePage.announcementBarContent.locator('strong')).toHaveText('today');

    // First thing in the body, above the theme's own markup.
    await expect(homePage.bodyChildren.first()).toHaveAttribute('id', 'announcement-bar-root');

    // Nothing was fetched to draw it: no CDN bundle, no members API call.
    expect(announcementRequests).toEqual([]);
  });

  test('is absent for a visitor outside the audience', async ({ page }) => {
    await settingsService.setAnnouncement({
      content: '<p>Members only</p>',
      audience: ['free_members', 'paid_members'],
    });

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.waitUntilLoaded();

    await expect(homePage.announcementBar).toHaveCount(0);
  });

  test('stays dismissed for the rest of the session', async ({ page }) => {
    await settingsService.setAnnouncement({
      content: '<p>Dismiss me</p>',
      audience: ['visitors'],
    });

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.announcementBarCloseButton.click();
    await expect(homePage.announcementBar).toHaveCount(0);

    await homePage.goto();
    await homePage.waitUntilLoaded();

    // Dismissal is checked before the bar is placed, so it never flashes.
    await expect(homePage.announcementBar).toHaveCount(0);
  });

  test('comes back once the announcement is edited', async ({ page }) => {
    await settingsService.setAnnouncement({
      content: '<p>First announcement</p>',
      audience: ['visitors'],
    });

    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.announcementBarCloseButton.click();

    await settingsService.setAnnouncement({
      content: '<p>Second announcement</p>',
      audience: ['visitors'],
    });
    await homePage.goto();

    await expect(homePage.announcementBarContent).toHaveText('Second announcement');
  });

  test('keeps an unbalanced announcement inside the bar', async ({ page }) => {
    // `announcement_content` is stored as authored, so the Admin API can put
    // stray closing tags in it. They must not close the bar early and spill
    // the rest of the announcement into the page.
    await settingsService.setAnnouncement({
      content: '<p>Hello</p></div></div><h1 id="escaped-heading">Escaped</h1>',
      audience: ['visitors'],
    });

    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.announcementBar).toBeVisible();
    // Had the stray tags closed the bar, this heading — and the close button
    // below it — would be siblings of the bar rather than children of it.
    await expect(homePage.announcementBar.locator('#escaped-heading')).toHaveCount(1);
    await expect(homePage.bodyChildren.first()).toHaveAttribute('id', 'announcement-bar-root');

    // And the bar is still usable.
    await expect(homePage.announcementBarCloseButton).toHaveCount(1);
    await homePage.announcementBarCloseButton.click();
    await expect(homePage.announcementBar).toHaveCount(0);
  });
});
