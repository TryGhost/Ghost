import type {
    ChangelogEntry,
    RawChangelogEntry,
    RawChangelogResponse,
} from "@/whats-new/hooks/use-changelog";

export const createMockChangelogEntry = (
    overrides: Partial<ChangelogEntry> = {}
): ChangelogEntry => ({
    id: "1",
    title: "Test Entry",
    excerpt: "Test excerpt",
    url: "https://ghost.org/changelog/1",
    publishedAt: new Date("2025-01-15T10:00:00Z"),
    featured: false,
    ...overrides,
});

export const createRawChangelogEntry = (
    overrides: Partial<RawChangelogEntry> = {}
): RawChangelogEntry => ({
    id: "1",
    title: "Test Entry",
    excerpt: "Test excerpt",
    url: "https://ghost.org/changelog/1",
    published_at: "2025-01-15T10:00:00Z",
    featured: false,
    ...overrides,
});

export const createChangelogResponse = (
    overrides: Partial<RawChangelogResponse> = {}
): RawChangelogResponse => ({
    posts: [],
    changelogUrl: "https://ghost.org/changelog",
    ...overrides,
});

export const changelogFixtures = {
    newFeaturedEntry: createRawChangelogEntry({
        id: "1",
        title: "New Feature",
        excerpt: "Description",
        featured: true,
    }),
    bugFixEntry: createRawChangelogEntry({
        id: "2",
        title: "Bug Fix",
        excerpt: "Fixed issue",
        url: "https://ghost.org/changelog/2",
        published_at: "2025-01-10T10:00:00Z",
    }),
};
