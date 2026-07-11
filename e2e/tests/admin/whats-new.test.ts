import {WhatsNewBanner} from '@/admin-pages';
import {expect, test} from '@/helpers/playwright/fixture';
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

// Single-boot cases live in apps/admin/src/whats-new/whats-new.acceptance.test.tsx;
// this case stays because the banner link opens a real popup window.
test.describe('Ghost Admin - What\'s New Banner', () => {
    test.describe('banner notification', () => {
        test.describe('dismissal behavior', () => {
            test('hides banner immediately when link is clicked', async ({page}) => {
                await mockChangelog(page, [createEntry(daysFromNow(1))]);

                const banner = new WhatsNewBanner(page);
                await banner.goto();
                await banner.waitForBanner();

                await expect(banner.container).toBeVisible();

                await banner.clickLinkAndClosePopup();

                await expect(banner.container).toBeHidden();
            });
        });
    });
});
