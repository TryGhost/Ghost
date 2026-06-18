// Vendored from /e2e/tests/admin/whats-new.test.ts
import {WhatsNewBanner, WhatsNewMenu} from '../../helpers/whats-new-pages';
import {expect, test} from '../../helpers/fixture';
import type {Page} from '@playwright/test';

// Local type definition matching the API response format
type RawChangelogEntry = {
    slug: string;
    title: string;
    custom_excerpt: string;
    published_at: string;
    url: string;
    featured: string;
    feature_image?: string;
    html?: string;
};

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
} = {}): RawChangelogEntry {
    const title = options.title ?? 'Test Update';
    const slug = title.toLowerCase().replace(/\s+/g, '-');
    return {
        slug,
        title,
        custom_excerpt: options.excerpt ?? 'Test feature',
        published_at: publishedAt.toISOString(),
        url: `https://ghost.org/changelog/${slug}`,
        featured: (options.featured ?? false) ? 'true' : 'false',
        ...(options.feature_image && {feature_image: options.feature_image})
    };
}

async function mockChangelog(page: Page, entries: RawChangelogEntry[]): Promise<void> {
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

test.describe('Ghost Admin - What\'s New Banner', () => {
    test.describe('banner notification', () => {
        test('shows banner for new entries the user has not seen', async ({page}) => {
            await mockChangelog(page, [
                createEntry(daysFromNow(1), {
                    title: 'New Update',
                    excerpt: 'This is an exciting new feature'
                })
            ]);

            const banner = new WhatsNewBanner(page);
            await banner.goto();
            await banner.waitForBanner();

            await expect(banner.container).toBeVisible();
            await expect(banner.title).toHaveText('New Update');
            await expect(banner.excerpt).toHaveText('This is an exciting new feature');
        });

        test('does not show banner for entries from before user joined', async ({page}) => {
            await mockChangelog(page, [createEntry(daysAgo(30))]);

            const banner = new WhatsNewBanner(page);
            await banner.goto();

            await expect(banner.container).toBeHidden();
        });

        test('does not show banner when there are no entries', async ({page}) => {
            await mockChangelog(page, []);

            const banner = new WhatsNewBanner(page);
            await banner.goto();

            await expect(banner.container).toBeHidden();
        });

        test.describe('dismissal behavior', () => {
            test('hides banner immediately when close button is clicked', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1))]);

                const banner = new WhatsNewBanner(page);
                await banner.goto();
                await banner.waitForBanner();

                await expect(banner.container).toBeVisible();

                await banner.dismiss();

                await expect(banner.container).toBeHidden();
            });

            test('hides banner immediately when link is clicked', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1))]);

                const banner = new WhatsNewBanner(page);
                await banner.goto();
                await banner.waitForBanner();

                await expect(banner.container).toBeVisible();

                await banner.clickLinkAndClosePopup();

                await expect(banner.container).toBeHidden();
            });

            test('hides banner immediately when modal is opened', async ({page}) => {
                await mockChangelog(page, [
                    createEntry(daysFromNow(1), {feature_image: 'https://ghost.org/image1.jpg'}),
                    createEntry(daysAgo(5))
                ]);

                const banner = new WhatsNewBanner(page);
                const menu = new WhatsNewMenu(page);

                await banner.goto();
                await banner.waitForBanner();

                await expect(banner.container).toBeVisible();

                const modal = await menu.openWhatsNewModal();
                await modal.close();

                await expect(banner.container).toBeHidden();
            });

            test('banner remains hidden after reload when dismissed', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1))]);

                const banner = new WhatsNewBanner(page);
                await banner.goto();
                await banner.waitForBanner();

                await banner.dismiss();

                await banner.goto();
                await expect(banner.container).toBeHidden();
            });

            test('banner reappears when a new entry is published after dismissal', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1))]);

                const banner = new WhatsNewBanner(page);

                await banner.goto();
                await banner.waitForBanner();
                await banner.dismiss();

                await banner.goto();
                await expect(banner.container).toBeHidden();

                await mockChangelog(page, [
                    createEntry(daysFromNow(2), {
                        title: 'Second Update'
                    })
                ]);

                await banner.goto();
                await banner.waitForBanner();

                await expect(banner.container).toBeVisible();
                await expect(banner.title).toHaveText('Second Update');
            });
        });
    });
});
