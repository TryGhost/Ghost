import {vi} from 'vitest';

/**
 * Mock data factories for consistent test data generation
 * Provides builder pattern and factory functions for common test scenarios
 */

// Types for better TypeScript support
interface MockPost {
    id: string;
    uuid: string;
    title: string;
    slug: string;
    feature_image?: string | null;
    published_at: string;
    url?: string;
    excerpt?: string;
    email_only?: boolean;
    status?: string;
    email?: {
        opened_count: number;
        email_count: number;
        status?: string;
    } | null;
    count?: {
        clicks?: number;
    } | null;
    authors?: {
        name: string;
    }[];
}

interface MockStatsData {
    id: string;
    recipient_count: number | null;
    opened_count: number | null;
    open_rate: number | null;
    member_delta: number;
    free_members: number;
    paid_members: number;
    visitors: number;
}

interface MockApiResponse<T> {
    data: T;
    isLoading: boolean;
    error: Error | null;
    isError: boolean;
    refetch: ReturnType<typeof vi.fn>;
}

/**
 * Post Builder Pattern
 * Allows flexible creation of mock posts with sensible defaults
 */
export class MockPostBuilder {
    private post: MockPost;

    constructor() {
        this.post = {
            id: 'post-123',
            uuid: 'post-uuid-123',
            title: 'Test Post',
            slug: 'test-post',
            feature_image: 'https://example.com/image.jpg',
            published_at: '2024-01-15T10:00:00.000Z',
            url: 'https://example.com/test-post/',
            excerpt: 'This is a test post excerpt',
            email_only: false,
            status: 'published',
            email: {
                opened_count: 100,
                email_count: 200,
                status: 'sent'
            },
            count: {
                clicks: 50
            },
            authors: [{name: 'Test Author'}]
        };
    }

    withId(id: string): MockPostBuilder {
        this.post.id = id;
        return this;
    }

    withTitle(title: string): MockPostBuilder {
        this.post.title = title;
        return this;
    }

    withSlug(slug: string): MockPostBuilder {
        this.post.slug = slug;
        return this;
    }

    withAuthors(authors: {name: string}[]): MockPostBuilder {
        this.post.authors = authors;
        return this;
    }

    withEmail(email: typeof this.post.email): MockPostBuilder {
        this.post.email = email;
        return this;
    }

    withoutEmail(): MockPostBuilder {
        this.post.email = null;
        return this;
    }

    withClicks(clicks: number): MockPostBuilder {
        this.post.count = {clicks};
        return this;
    }

    withoutClicks(): MockPostBuilder {
        this.post.count = null;
        return this;
    }

    minimal(): MockPostBuilder {
        this.post = {
            id: this.post.id,
            uuid: this.post.uuid,
            title: '',
            slug: '',
            published_at: this.post.published_at
        };
        return this;
    }

    build(): MockPost {
        return {...this.post};
    }
}

/**
 * Stats Data Builder Pattern
 */
export class MockStatsBuilder {
    private stats: MockStatsData;

    constructor() {
        this.stats = {
            id: 'post-123',
            recipient_count: 200,
            opened_count: 100,
            open_rate: 0.5,
            member_delta: 5,
            free_members: 3,
            paid_members: 2,
            visitors: 150
        };
    }

    withId(id: string): MockStatsBuilder {
        this.stats.id = id;
        return this;
    }

    withRecipients(count: number): MockStatsBuilder {
        this.stats.recipient_count = count;
        return this;
    }

    withOpens(count: number, rate?: number): MockStatsBuilder {
        this.stats.opened_count = count;
        if (rate !== undefined) {
            this.stats.open_rate = rate;
        } else if (this.stats.recipient_count) {
            this.stats.open_rate = count / this.stats.recipient_count;
        }
        return this;
    }

    withMemberGrowth(delta: number, free: number = 0, paid: number = 0): MockStatsBuilder {
        this.stats.member_delta = delta;
        this.stats.free_members = free;
        this.stats.paid_members = paid;
        return this;
    }

    withVisitors(count: number): MockStatsBuilder {
        this.stats.visitors = count;
        return this;
    }

    withNullValues(): MockStatsBuilder {
        this.stats.recipient_count = null;
        this.stats.opened_count = null;
        this.stats.open_rate = null;
        return this;
    }

    build(): MockStatsData {
        return {...this.stats};
    }
}

/**
 * API Response Builder Pattern
 */
export class MockApiResponseBuilder<T> {
    private response: MockApiResponse<T>;

    constructor(data: T) {
        this.response = {
            data,
            isLoading: false,
            error: null,
            isError: false,
            refetch: vi.fn()
        };
    }

    loading(): MockApiResponseBuilder<T> {
        this.response.isLoading = true;
        this.response.data = null as unknown as T;
        return this;
    }

    withError(error: Error): MockApiResponseBuilder<T> {
        this.response.error = error;
        this.response.isError = true;
        this.response.data = null as unknown as T;
        return this;
    }

    build(): MockApiResponse<T> {
        return {...this.response};
    }
}

/**
 * Factory functions for common scenarios
 */

// Quick post factories
export const createMockPost = () => new MockPostBuilder().build();

export const createMinimalPost = () => new MockPostBuilder().minimal().build();

export const createPostWithoutEmail = () => new MockPostBuilder().withoutEmail().build();

// Quick stats factories  
export const createMockStats = () => new MockStatsBuilder().build();

export const createStatsWithNulls = () => new MockStatsBuilder().withNullValues().build();

// API response factories
export const createSuccessResponse = <T>(data: T) => new MockApiResponseBuilder(data).build();

export const createLoadingResponse = <T>() => new MockApiResponseBuilder(null as unknown as T).loading().build();

export const createErrorResponse = <T>(error: Error) => new MockApiResponseBuilder(null as unknown as T).withError(error).build();

/**
 * Newsletter-specific factories
 */
export const createMockNewsletterStats = (postIds: string[] = ['post-1', 'post-2']) => ({
    stats: postIds.map((postId, index) => ({
        post_id: postId,
        open_rate: 0.5 + (index * 0.1),
        subject: `Subject ${index + 1}`,
        sent_count: 100,
        opened_count: Math.floor((0.5 + (index * 0.1)) * 100)
    })),
    meta: {
        pagination: {
            page: 1,
            limit: 15,
            pages: 1,
            total: postIds.length,
            next: null,
            prev: null
        }
    }
});

export const createMockClickStats = (postIds: string[] = ['post-1', 'post-2']) => ({
    stats: postIds.map((postId, index) => ({
        post_id: postId,
        total_clicks: 100 + (index * 50),
        click_rate: 0.1 + (index * 0.05)
    }))
});

/**
 * Test parameter factories
 */
export const createStandardApiParams = (additionalParams: Record<string, unknown> = {}) => ({
    searchParams: {
        date_from: '2024-01-01',
        date_to: '2024-01-15',
        order: 'date desc',
        ...additionalParams
    },
    enabled: true
});

/**
 * Common test scenarios
 */
export const TEST_SCENARIOS = {
    // Newsletter scenarios
    NEWSLETTER_WITH_STATS: {
        basicStats: createMockNewsletterStats(['post-1', 'post-2']),
        clickStats: createMockClickStats(['post-1', 'post-2'])
    },
    
    NEWSLETTER_WITHOUT_CLICKS: {
        basicStats: createMockNewsletterStats(['post-1']),
        clickStats: {stats: []}
    },
    
    // Post scenarios
    POST_WITH_FULL_DATA: createMockPost(),
    POST_MINIMAL: createMinimalPost(),
    POST_WITHOUT_EMAIL: createPostWithoutEmail(),
    
    // Stats scenarios
    STATS_WITH_DATA: createMockStats(),
    STATS_WITH_NULLS: createStatsWithNulls()
} as const;