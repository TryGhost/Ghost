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

export function daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
}

export function daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

export function createEntry(publishedAt: Date, options: {
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

export async function mockChangelog(page: Page, entries: RawChangelogEntry[]): Promise<void> {
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
