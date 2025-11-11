import type { ChangelogEntry, RawChangelogEntry, RawChangelogResponse } from "@/whats-new/hooks/use-changelog";

/**
 * Creates a raw changelog entry matching the Ghost API response format.
 * Based on the real Ghost changelog API at https://ghost.org/changelog.json
 *
 * Note: Ghost returns dates in ISO 8601 format with timezone offset and milliseconds
 * (via moment-timezone's toISOString(true)): "2025-01-15T10:00:00.000+00:00"
 */
export const createRawChangelogEntry = (overrides: Partial<RawChangelogEntry> = {}): RawChangelogEntry => ({
    slug: "test-entry-1",
    title: "Test Entry",
    custom_excerpt: "Test excerpt",
    url: "https://ghost.org/changelog/test-entry-1",
    published_at: "2025-01-15T10:00:00.000+00:00",
    featured: "false",
    feature_image: "https://ghost.org/images/test-feature.png",
    html: "<p>Full HTML content here</p>",
    ...overrides,
});

/**
 * Creates a parsed changelog entry.
 * This represents what the hook returns after processing the raw API response.
 */
export const createChangelogEntry = (overrides: Partial<ChangelogEntry> = {}): ChangelogEntry => ({
    slug: "test-entry-1",
    title: "Test Entry",
    customExcerpt: "Test excerpt",
    url: "https://ghost.org/changelog/test-entry-1",
    publishedAt: new Date("2025-01-15T10:00:00.000+00:00"),
    featured: false,
    featureImage: "https://ghost.org/images/test-feature.png",
    html: "<p>Full HTML content here</p>",
    ...overrides,
});

export const createChangelogResponse = (overrides: Partial<RawChangelogResponse> = {}): RawChangelogResponse => ({
    posts: [],
    changelogUrl: "https://ghost.org/changelog",
    ...overrides,
});

/**
 * Pre-configured changelog fixtures for common test scenarios.
 * Includes both raw (API format) and parsed (output format) versions.
 */
export const changelogFixtures = {
    // Raw fixtures (for MSW mocks)
    raw: {
        featuredEntry: createRawChangelogEntry({
            slug: "new-feature-2025",
            title: "New Feature",
            custom_excerpt: "Description",
            url: "https://ghost.org/changelog/new-feature-2025",
            featured: "true",
            feature_image: "https://ghost.org/images/new-feature.png",
            html: "<p>Exciting new feature details</p>",
        }),
        regularEntry: createRawChangelogEntry({
            slug: "bug-fix-update",
            title: "Bug Fix",
            custom_excerpt: "Fixed issue",
            url: "https://ghost.org/changelog/bug-fix-update",
            published_at: "2025-01-10T10:00:00.000+00:00",
            featured: "false",
            feature_image: "https://ghost.org/images/bug-fix.png",
            html: "<p>Bug fix details</p>",
        }),
    },
    // Parsed fixtures (for test expectations)
    parsed: {
        featuredEntry: createChangelogEntry({
            slug: "new-feature-2025",
            title: "New Feature",
            customExcerpt: "Description",
            url: "https://ghost.org/changelog/new-feature-2025",
            publishedAt: new Date("2025-01-15T10:00:00.000+00:00"),
            featured: true,
            featureImage: "https://ghost.org/images/new-feature.png",
            html: "<p>Exciting new feature details</p>",
        }),
        regularEntry: createChangelogEntry({
            slug: "bug-fix-update",
            title: "Bug Fix",
            customExcerpt: "Fixed issue",
            url: "https://ghost.org/changelog/bug-fix-update",
            publishedAt: new Date("2025-01-10T10:00:00.000+00:00"),
            featured: false,
            featureImage: "https://ghost.org/images/bug-fix.png",
            html: "<p>Bug fix details</p>",
        }),
    },
};
