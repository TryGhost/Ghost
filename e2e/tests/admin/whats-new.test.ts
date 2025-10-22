import {test, expect} from '../../helpers/playwright/fixture';
import {WhatsNewBanner, WhatsNewMenu} from '../../helpers/pages/admin/whats-new';
import {createUserService} from '../../helpers/services/user';
import type {Page} from '@playwright/test';

interface ChangelogEntry {
    title: string;
    custom_excerpt: string;
    published_at: string;
    url: string;
    featured: boolean;
    feature_image?: string;
}

const ENTRIES = {
    newFeatured: {
        title: 'New Featured Update',
        custom_excerpt: 'This is an exciting new feature',
        published_at: '2024-01-15T12:00:00.000+00:00',
        url: 'https://ghost.org/changelog/new-feature',
        featured: true
    },
    old: {
        title: 'Old Update',
        custom_excerpt: 'This is old',
        published_at: '2018-12-01T12:00:00.000+00:00',
        url: 'https://ghost.org/changelog/old-feature',
        featured: true
    },
    newNonFeatured: {
        title: 'Non-Featured Update',
        custom_excerpt: 'This is not featured',
        published_at: '2024-01-15T12:00:00.000+00:00',
        url: 'https://ghost.org/changelog/regular-feature',
        featured: false
    },
    newRegular: {
        title: 'New Update',
        custom_excerpt: 'New feature',
        published_at: '2024-01-15T12:00:00.000+00:00',
        url: 'https://ghost.org/changelog/new',
        featured: false
    },
    latest: {
        title: 'Latest Update',
        custom_excerpt: 'Latest feature',
        published_at: '2024-01-15T12:00:00.000+00:00',
        url: 'https://ghost.org/changelog/latest',
        featured: true,
        feature_image: 'https://ghost.org/image1.jpg'
    },
    previous: {
        title: 'Previous Update',
        custom_excerpt: 'Previous feature',
        published_at: '2024-01-10T12:00:00.000+00:00',
        url: 'https://ghost.org/changelog/previous',
        featured: false
    }
} as const;

async function mockChangelog(page: Page, entries: ChangelogEntry[]): Promise<void> {
    await page.route('https://ghost.org/changelog.json', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                posts: entries,
                changelogUrl: 'https://ghost.org/changelog/'
            })
        });
    });
}

test.describe('Ghost Admin - What\'s New', () => {
    test.beforeEach(async ({page}) => {
        const userService = createUserService(page.request);
        await userService.updateCurrentUserAccessibility({
            whatsNew: {
                lastSeenDate: '2019-01-01 00:00:00'
            }
        });
    });

    test.describe('banner notification', () => {
        test('shows banner with latest entry when there are new featured entries', async ({page}) => {
            await mockChangelog(page, [ENTRIES.newFeatured]);
            const banner = new WhatsNewBanner(page);

            await banner.goto();
            await banner.waitForBanner();

            await expect(banner.container).toBeVisible();
            await expect(banner.title).toHaveText('New Featured Update');
            await expect(banner.excerpt).toHaveText('This is an exciting new feature');
        });

        test('does not show banner when there are no new entries', async ({page}) => {
            await mockChangelog(page, [ENTRIES.old]);
            const banner = new WhatsNewBanner(page);

            await banner.goto();

            await expect(banner.container).not.toBeVisible();
        });

        test('does not show banner when there are no entries at all', async ({page}) => {
            await mockChangelog(page, []);
            const banner = new WhatsNewBanner(page);

            await banner.goto();

            await expect(banner.container).not.toBeVisible();
        });

        test('does not show banner when latest entry is not featured', async ({page}) => {
            await mockChangelog(page, [ENTRIES.newNonFeatured]);
            const banner = new WhatsNewBanner(page);

            await banner.goto();

            await expect(banner.container).not.toBeVisible();
        });

        test('does not show banner for new users', async ({page}) => {
            const userService = createUserService(page.request);
            await userService.updateCurrentUserAccessibility({});

            await mockChangelog(page, [ENTRIES.newFeatured]);
            const banner = new WhatsNewBanner(page);

            await banner.goto();

            await expect(banner.container).not.toBeVisible();
        });

        test('does not show banner again after dismissal', async ({page}) => {
            await mockChangelog(page, [ENTRIES.newFeatured]);
            const banner = new WhatsNewBanner(page);

            await banner.goto();
            await banner.waitForBanner();

            await expect(banner.container).toBeVisible();

            await banner.dismiss();

            await expect(banner.container).not.toBeVisible();

            await banner.goto();
            await expect(banner.container).not.toBeVisible();
        });

        test('does not show banner again after clicking link', async ({page}) => {
            await mockChangelog(page, [ENTRIES.newFeatured]);
            const banner = new WhatsNewBanner(page);

            await banner.goto();
            await banner.waitForBanner();

            await banner.clickLinkAndClosePopup();

            await banner.goto();
            await expect(banner.container).not.toBeVisible();
        });
    });

    test.describe('modal', () => {
        test('shows modal with all entries when opened from user menu', async ({page}) => {
            await mockChangelog(page, [ENTRIES.latest, ENTRIES.previous]);
            const menu = new WhatsNewMenu(page);

            await menu.goto();

            const modal = await menu.openWhatsNewModal();

            await expect(modal.modal).toBeVisible();
            await expect(modal.title).toBeVisible();

            const entries = await modal.getEntries();
            expect(entries.length).toBe(2);

            expect(entries[0].title).toBe('Latest Update');
            expect(entries[0].excerpt).toBe('Latest feature');
            expect(entries[0].hasImage).toBe(true);

            expect(entries[1].title).toBe('Previous Update');
            expect(entries[1].excerpt).toBe('Previous feature');
        });

        test('dismisses the banner after modal is opened', async ({page}) => {
            await mockChangelog(page, [ENTRIES.latest, ENTRIES.previous]);
            const banner = new WhatsNewBanner(page);
            const menu = new WhatsNewMenu(page);

            await banner.goto();

            await banner.waitForBanner();
            await expect(banner.container).toBeVisible();

            const modal = await menu.openWhatsNewModal();
            await modal.close();

            await expect(banner.container).not.toBeVisible();

            await banner.goto();
            await expect(banner.container).not.toBeVisible();
        });
    });

    test.describe('badge indicators', () => {
        test('shows badge on user avatar when there are new non-featured entries', async ({page}) => {
            await mockChangelog(page, [ENTRIES.newRegular]);
            const menu = new WhatsNewMenu(page);

            await menu.goto();

            await expect(menu.avatarBadge).toBeVisible();
        });

        test('shows badge in user menu when there are new entries', async ({page}) => {
            await mockChangelog(page, [ENTRIES.newRegular]);
            const menu = new WhatsNewMenu(page);

            await menu.goto();
            await menu.openUserMenu();

            await expect(menu.menuBadge).toBeVisible();
        });

        test('does not show badges when there are no new entries', async ({page}) => {
            await mockChangelog(page, [ENTRIES.old]);
            const menu = new WhatsNewMenu(page);

            await menu.goto();

            await expect(menu.avatarBadge).not.toBeVisible();

            await menu.openUserMenu();
            await expect(menu.menuBadge).not.toBeVisible();
        });

        test('removes badges after viewing What\'s new', async ({page}) => {
            await mockChangelog(page, [ENTRIES.newRegular]);
            const menu = new WhatsNewMenu(page);

            await menu.goto();

            await expect(menu.avatarBadge).toBeVisible();

            const modal = await menu.openWhatsNewModal();
            await modal.close();

            await expect(menu.avatarBadge).not.toBeVisible();

            await menu.goto();
            await expect(menu.avatarBadge).not.toBeVisible();
        });
    });
});
