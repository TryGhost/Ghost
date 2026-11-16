import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  changelogEntry,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeAdminStats,
  fakeEndpoint,
  fakeTags,
  renderAdminApp,
  type CurrentUserResponse,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { tagsScreen } from '@/tags/tags.screen';
import { whatsNewScreen } from './whats-new.screen';

const LAST_SEEN = '2025-01-01T00:00:00.000Z';
const NEWER_THAN_LAST_SEEN = '2025-06-01T00:00:00.000Z';

function userWhoLastSawChangelogAt(lastSeenDate: string): CurrentUserResponse {
  const me = currentUserResponse();
  me.users[0].accessibility = JSON.stringify({ whatsNew: { lastSeenDate } });
  return me;
}

describe("What's new banner", () => {
  it.each([true, false])(
    'keeps its hover action dismissible with Admin 7 = %s',
    async (admin7Design) => {
      fakeTags([]);
      fakeAdminStats.memberCount();
      fakeAdminStats.mrr();
      fakeEndpoint('GET', 'https://ghost.org/changelog.json', {
        posts: [changelogEntry({ published_at: NEWER_THAN_LAST_SEEN })],
      });
      fakeAdminEndpoint('PUT', /^\/users\/\w+\//, ({ body }) => body);
      await renderAdminApp('/tags', {
        labs: { admin7Design },
        boot: { browseMe: { response: userWhoLastSawChangelogAt(LAST_SEEN) } },
      });
      if (admin7Design) {
        await expect.poll(sidebarScreen.floatingState).toBe('pinned');
      }
      const banner = whatsNewScreen.banner();
      await expect.element(banner).toBeVisible();
      const initialWidth = banner.element().getBoundingClientRect().width;
      if (admin7Design) {
        const menuRect = sidebarScreen.navLink('Tags').element().getBoundingClientRect();
        const bannerRect = banner.element().getBoundingClientRect();
        expect(Math.abs(bannerRect.left - menuRect.left)).toBeLessThan(1);
        expect(Math.abs(bannerRect.width - menuRect.width)).toBeLessThan(1);
      }
      await userEvent.hover(banner);
      await expect
        .poll(() => getComputedStyle(banner.element(), '::after').animationName)
        .toBe(admin7Design ? 'sidebar-banner-shine' : 'none');
      if (admin7Design) {
        await expect
          .poll(() => banner.element().getBoundingClientRect().width)
          .toBeGreaterThan(initialWidth);
      }
      await whatsNewScreen.dismissButton().click();
      await expect(banner).toHaveCount(0);
    },
  );

  it('shows no banner when the changelog feed is empty', async () => {
    // The default boot serves an empty changelog feed.
    fakeTags([]);
    await renderAdminApp('/tags');

    // Prove absence only after the page has settled.
    await expect.element(tagsScreen.emptyStateHeading()).toBeVisible();
    await expect.element(whatsNewScreen.banner()).not.toBeInTheDocument();
  });

  it("shows the banner when an entry is newer than the user's last seen date", async () => {
    fakeTags([]);
    fakeEndpoint('GET', 'https://ghost.org/changelog.json', {
      posts: [
        changelogEntry({
          title: 'New Update',
          custom_excerpt: 'This is an exciting new feature',
          published_at: NEWER_THAN_LAST_SEEN,
        }),
      ],
    });
    await renderAdminApp('/tags', {
      boot: { browseMe: { response: userWhoLastSawChangelogAt(LAST_SEEN) } },
    });

    await expect.element(whatsNewScreen.banner()).toBeVisible();
    await expect.element(whatsNewScreen.bannerTitle()).toHaveTextContent('New Update');
    await expect
      .element(whatsNewScreen.bannerExcerpt())
      .toHaveTextContent('This is an exciting new feature');
  });

  it("dismissing the banner persists the entry's date as last seen", async () => {
    fakeTags([]);
    fakeEndpoint('GET', 'https://ghost.org/changelog.json', {
      posts: [changelogEntry({ published_at: NEWER_THAN_LAST_SEEN })],
    });
    // Echo the PUT so the client's write persists (see boot.ts's editUserPreferences).
    const prefsApi = fakeAdminEndpoint('PUT', /^\/users\/\w+\//, ({ body }) => body);
    await renderAdminApp('/tags', {
      boot: { browseMe: { response: userWhoLastSawChangelogAt(LAST_SEEN) } },
    });

    await expect.element(whatsNewScreen.banner()).toBeVisible();
    await whatsNewScreen.dismissButton().click();

    await expect.element(whatsNewScreen.banner()).not.toBeInTheDocument();
    await expect
      .poll(() => {
        const body = prefsApi.lastRequest?.body as
          | { users: Array<{ accessibility: string }> }
          | undefined;
        if (!body) {
          return undefined;
        }
        const preferences = JSON.parse(body.users[0].accessibility) as {
          whatsNew?: { lastSeenDate?: string };
        };
        return preferences.whatsNew?.lastSeenDate;
      })
      .toBe(NEWER_THAN_LAST_SEEN);
  });
});

describe("What's new menu", () => {
  it("shows the changelog entries in the What's new modal", async () => {
    fakeEndpoint('GET', 'https://ghost.org/changelog.json', {
      posts: [
        changelogEntry({
          title: 'Latest Update',
          custom_excerpt: 'Latest feature',
          published_at: NEWER_THAN_LAST_SEEN,
          // Non-blocklisted host: image requests bypass the worker.
          feature_image: 'https://static.test/latest-update.jpg',
        }),
        changelogEntry({
          title: 'Previous Update',
          custom_excerpt: 'Previous feature',
          published_at: LAST_SEEN,
        }),
      ],
    });
    await renderAdminApp('/site');

    await sidebarScreen.userMenuTrigger().click();
    await whatsNewScreen.menuItem().click();

    await expect.element(whatsNewScreen.dialog()).toBeVisible();
    await expect(whatsNewScreen.entries()).toHaveCount(2);
    await expect.element(whatsNewScreen.entry(0)).toHaveTextContent('Latest Update');
    await expect.element(whatsNewScreen.entry(0)).toHaveTextContent('Latest feature');
    await expect.element(whatsNewScreen.entryImage(0)).toBeVisible();
    await expect.element(whatsNewScreen.entry(1)).toHaveTextContent('Previous Update');
    await expect.element(whatsNewScreen.entry(1)).toHaveTextContent('Previous feature');
  });

  it("shows badges when an entry is newer than the user's last seen date", async () => {
    fakeEndpoint('GET', 'https://ghost.org/changelog.json', {
      posts: [changelogEntry({ published_at: NEWER_THAN_LAST_SEEN })],
    });
    await renderAdminApp('/site', {
      boot: { browseMe: { response: userWhoLastSawChangelogAt(LAST_SEEN) } },
    });

    await expect.element(whatsNewScreen.avatarBadge()).toBeVisible();

    await sidebarScreen.userMenuTrigger().click();
    await expect.element(whatsNewScreen.menuBadge()).toBeVisible();
  });

  it('shows no banner or badges for entries from before the user joined', async () => {
    // A user with no stored what's-new state is initialized to the present day.
    fakeEndpoint('GET', 'https://ghost.org/changelog.json', {
      posts: [changelogEntry({ published_at: '2020-01-01T00:00:00.000Z' })],
    });
    await renderAdminApp('/site');

    await sidebarScreen.userMenuTrigger().click();
    await expect.element(whatsNewScreen.menuItem()).toBeVisible();
    await expect.element(whatsNewScreen.menuBadge()).not.toBeInTheDocument();
    await expect.element(whatsNewScreen.avatarBadge()).not.toBeInTheDocument();
    await expect.element(whatsNewScreen.banner()).not.toBeInTheDocument();
  });

  it("clears the banner and badges when the What's new modal is opened", async () => {
    fakeEndpoint('GET', 'https://ghost.org/changelog.json', {
      posts: [changelogEntry({ published_at: NEWER_THAN_LAST_SEEN })],
    });
    await renderAdminApp('/site', {
      boot: { browseMe: { response: userWhoLastSawChangelogAt(LAST_SEEN) } },
    });

    await expect.element(whatsNewScreen.banner()).toBeVisible();
    await expect.element(whatsNewScreen.avatarBadge()).toBeVisible();

    await sidebarScreen.userMenuTrigger().click();
    await whatsNewScreen.menuItem().click();
    await expect.element(whatsNewScreen.dialog()).toBeVisible();
    await whatsNewScreen.closeDialog();

    await expect.element(whatsNewScreen.dialog()).not.toBeInTheDocument();
    await expect.element(whatsNewScreen.banner()).not.toBeInTheDocument();
    await expect.element(whatsNewScreen.avatarBadge()).not.toBeInTheDocument();
  });
});
