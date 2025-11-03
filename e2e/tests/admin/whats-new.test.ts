import {WhatsNewBanner, WhatsNewMenu} from '../../helpers/pages/admin/whats-new';
import {expect, test} from '../../helpers/playwright/fixture';
import type {Page} from '@playwright/test';

interface ChangelogEntry {
    title: string;
    custom_excerpt: string;
    published_at: string;
    url: string;
    featured: boolean;
    feature_image?: string;
}

function daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

function daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

function createEntry(publishedAt: Date, options: {
    featured?: boolean;
    title?: string;
    excerpt?: string;
    feature_image?: string;
} = {}): ChangelogEntry {
    const title = options.title ?? 'Test Update';
    return {
        title,
        custom_excerpt: options.excerpt ?? 'Test feature',
        published_at: publishedAt.toISOString(),
        url: `https://ghost.org/changelog/${title.toLowerCase().replace(/\s+/g, '-')}`,
        featured: options.featured ?? false,
        ...(options.feature_image && {feature_image: options.feature_image})
    };
}

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
    test.describe('banner notification', () => {
        test('shows banner for new featured entries the user has not seen', async ({page}) => {
            await mockChangelog(page, [
                createEntry(daysFromNow(1), {
                    featured: true,
                    title: 'New Featured Update',
                    excerpt: 'This is an exciting new feature'
                })
            ]);

            const banner = new WhatsNewBanner(page);
            await banner.goto();
            await banner.waitForBanner();

            await expect(banner.container).toBeVisible();
            await expect(banner.title).toHaveText('New Featured Update');
            await expect(banner.excerpt).toHaveText('This is an exciting new feature');
        });

        test('does not show banner for entries from before user joined', async ({page}) => {
            await mockChangelog(page, [createEntry(daysAgo(30), {featured: true})]);

            const banner = new WhatsNewBanner(page);
            await banner.goto();

            await expect(banner.container).not.toBeVisible();
        });

        test('does not show banner when there are no entries', async ({page}) => {
            await mockChangelog(page, []);

            const banner = new WhatsNewBanner(page);
            await banner.goto();

            await expect(banner.container).not.toBeVisible();
        });

        test('does not show banner when latest entry is not featured', async ({page}) => {
            await mockChangelog(page, [createEntry(daysFromNow(1))]);

            const banner = new WhatsNewBanner(page);
            await banner.goto();

            await expect(banner.container).not.toBeVisible();
        });

        test.describe('dismissal behavior', () => {
            test('hides banner immediately when close button is clicked', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1), {featured: true})]);

                const banner = new WhatsNewBanner(page);
                await banner.goto();
                await banner.waitForBanner();

                await expect(banner.container).toBeVisible();

                await banner.dismiss();

                await expect(banner.container).not.toBeVisible();
            });

            test('hides banner immediately when link is clicked', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1), {featured: true})]);

                const banner = new WhatsNewBanner(page);
                await banner.goto();
                await banner.waitForBanner();

                await expect(banner.container).toBeVisible();

                await banner.clickLinkAndClosePopup();

                await expect(banner.container).not.toBeVisible();
            });

            test('hides banner immediately when modal is opened', async ({page}) => {
                await mockChangelog(page, [
                    createEntry(daysFromNow(1), {featured: true, feature_image: 'https://ghost.org/image1.jpg'}),
                    createEntry(daysAgo(5))
                ]);

                const banner = new WhatsNewBanner(page);
                const menu = new WhatsNewMenu(page);

                await banner.goto();
                await banner.waitForBanner();

                await expect(banner.container).toBeVisible();

                const modal = await menu.openWhatsNewModal();
                await modal.close();

                await expect(banner.container).not.toBeVisible();
            });

            test('banner remains hidden after reload when dismissed', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1), {featured: true})]);

                const banner = new WhatsNewBanner(page);
                await banner.goto();
                await banner.waitForBanner();

                await banner.dismiss();

                await banner.goto();
                await expect(banner.container).not.toBeVisible();
            });

            test('banner reappears when a new entry is published after dismissal', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1), {featured: true})]);

                const banner = new WhatsNewBanner(page);

                await banner.goto();
                await banner.waitForBanner();
                await banner.dismiss();

                await banner.goto();
                await expect(banner.container).not.toBeVisible();

                await mockChangelog(page, [
                    createEntry(daysFromNow(2), {
                        featured: true,
                        title: 'Second Featured Update'
                    })
                ]);

                await banner.goto();
                await banner.waitForBanner();

                await expect(banner.container).toBeVisible();
                await expect(banner.title).toHaveText('Second Featured Update');
            });
        });
    });

    test.describe('modal', () => {
        test('shows modal with all entries when opened from user menu', async ({page}) => {
            await mockChangelog(page, [
                createEntry(daysFromNow(1), {
                    featured: true,
                    title: 'Latest Update',
                    excerpt: 'Latest feature',
                    feature_image: 'https://ghost.org/image1.jpg'
                }),
                createEntry(daysAgo(5), {
                    title: 'Previous Update',
                    excerpt: 'Previous feature'
                })
            ]);

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
    });

    test.describe('badge indicators', () => {
        test('shows badge for new non-featured entries the user has not seen', async ({page}) => {
            await mockChangelog(page, [createEntry(daysFromNow(1))]);

            const menu = new WhatsNewMenu(page);
            await menu.goto();

            await expect(menu.avatarBadge).toBeVisible();
        });

        test('shows badge in user menu when there are new entries', async ({page}) => {
            await mockChangelog(page, [createEntry(daysFromNow(1))]);

            const menu = new WhatsNewMenu(page);
            await menu.goto();
            await menu.openUserMenu();

            await expect(menu.menuBadge).toBeVisible();
        });

        test('does not show badges for entries from before user joined', async ({page}) => {
            await mockChangelog(page, [createEntry(daysAgo(30))]);

            const menu = new WhatsNewMenu(page);
            await menu.goto();

            await expect(menu.avatarBadge).not.toBeVisible();

            await menu.openUserMenu();
            await expect(menu.menuBadge).not.toBeVisible();
        });

        test.describe('dismissal behavior', () => {
            test('hides badges immediately when What\'s new modal is opened', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1))]);

                const menu = new WhatsNewMenu(page);
                await menu.goto();

                await expect(menu.avatarBadge).toBeVisible();

                const modal = await menu.openWhatsNewModal();
                await modal.close();

                await expect(menu.avatarBadge).not.toBeVisible();
            });

            test('badges remain hidden after reload when What\'s new has been viewed', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1))]);

                const menu = new WhatsNewMenu(page);
                await menu.goto();

                const modal = await menu.openWhatsNewModal();
                await modal.close();

                await menu.goto();
                await expect(menu.avatarBadge).not.toBeVisible();
            });

            test('badges reappear when a new entry is published after viewing', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1))]);

                const menu = new WhatsNewMenu(page);
                await menu.goto();

                const modal = await menu.openWhatsNewModal();
                await modal.close();

                await menu.goto();
                await expect(menu.avatarBadge).not.toBeVisible();

                await mockChangelog(page, [createEntry(daysFromNow(2))]);

                await menu.goto();

                await expect(menu.avatarBadge).toBeVisible();
            });
        });
    });
});
