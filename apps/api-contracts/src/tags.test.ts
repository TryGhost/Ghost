import { describe, it, expect } from 'vitest';
import {
    TagSchema,
    TagsResponseSchema,
    TagResponseSchema,
    TagCreateSchema,
    TagUpdateSchema,
} from './tags';

describe('TagSchema', () => {
    const validTag = {
        id: '507f1f77bcf86cd799439011',
        name: 'Getting Started',
        slug: 'getting-started',
        url: 'http://localhost:2368/tag/getting-started/',
        description: 'A helpful tag for beginners',
        visibility: 'public' as const,
        meta_title: 'Getting Started - Ghost',
        meta_description: 'Learn how to get started with Ghost',
        twitter_image: 'https://example.com/twitter.jpg',
        twitter_title: 'Getting Started',
        twitter_description: 'Learn Ghost',
        og_image: 'https://example.com/og.jpg',
        og_title: 'Getting Started',
        og_description: 'Learn Ghost',
        codeinjection_head: '<script>console.log("head")</script>',
        codeinjection_foot: '<script>console.log("foot")</script>',
        canonical_url: 'https://example.com/getting-started',
        accent_color: '#FF0000',
        feature_image: 'https://example.com/feature.jpg',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-02T12:30:45.000Z',
    };

    it('validates a complete tag object with all fields', () => {
        const result = TagSchema.safeParse(validTag);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual(validTag);
        }
    });

    it('validates a tag with null optional fields', () => {
        const tagWithNulls = {
            ...validTag,
            description: null,
            meta_title: null,
            meta_description: null,
            twitter_image: null,
            twitter_title: null,
            twitter_description: null,
            og_image: null,
            og_title: null,
            og_description: null,
            codeinjection_head: null,
            codeinjection_foot: null,
            canonical_url: null,
            accent_color: null,
            feature_image: null,
        };

        const result = TagSchema.safeParse(tagWithNulls);
        expect(result.success).toBe(true);
    });

    it('validates a tag with count relation', () => {
        const tagWithCount = {
            ...validTag,
            count: {
                posts: 42,
            },
        };

        const result = TagSchema.safeParse(tagWithCount);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.count?.posts).toBe(42);
        }
    });

    it('validates internal visibility', () => {
        const internalTag = {
            ...validTag,
            name: '#internal-tag',
            visibility: 'internal' as const,
        };

        const result = TagSchema.safeParse(internalTag);
        expect(result.success).toBe(true);
    });

    it('rejects invalid visibility value', () => {
        const invalidTag = {
            ...validTag,
            visibility: 'private',
        };

        const result = TagSchema.safeParse(invalidTag);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].path).toContain('visibility');
        }
    });

    it('rejects invalid ID format', () => {
        const invalidTag = {
            ...validTag,
            id: 'invalid-id',
        };

        const result = TagSchema.safeParse(invalidTag);
        expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
        const invalidTag = {
            ...validTag,
            name: '',
        };

        const result = TagSchema.safeParse(invalidTag);
        expect(result.success).toBe(false);
    });

    it('rejects name longer than 191 characters', () => {
        const invalidTag = {
            ...validTag,
            name: 'a'.repeat(192),
        };

        const result = TagSchema.safeParse(invalidTag);
        expect(result.success).toBe(false);
    });

    it('rejects invalid datetime format', () => {
        const invalidTag = {
            ...validTag,
            created_at: '2023-01-01',
        };

        const result = TagSchema.safeParse(invalidTag);
        expect(result.success).toBe(false);
    });

    it('allows missing optional fields (input schema has no required fields)', () => {
        // TagsInputSchema (from JSON Schema) has no required fields
        // Required fields are enforced by TagCreateSchema
        const tagWithoutName = {
            ...validTag,
            name: undefined,
        };
        delete (tagWithoutName as any).name;

        const result = TagSchema.safeParse(tagWithoutName);
        // TagSchema extends TagsInputSchema, so it allows missing name
        expect(result.success).toBe(true);
    });
});

describe('TagsResponseSchema', () => {
    const validResponse = {
        tags: [
            {
                id: '507f1f77bcf86cd799439011',
                name: 'Tag 1',
                slug: 'tag-1',
                url: 'http://localhost:2368/tag/tag-1/',
                description: null,
                visibility: 'public' as const,
                meta_title: null,
                meta_description: null,
                twitter_image: null,
                twitter_title: null,
                twitter_description: null,
                og_image: null,
                og_title: null,
                og_description: null,
                codeinjection_head: null,
                codeinjection_foot: null,
                canonical_url: null,
                accent_color: null,
                feature_image: null,
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z',
            },
        ],
        meta: {
            pagination: {
                page: 1,
                limit: 15,
                pages: 1,
                total: 1,
                next: null,
                prev: null,
            },
        },
    };

    it('validates a complete tags response', () => {
        const result = TagsResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
    });

    it('validates response without meta', () => {
        const { meta, ...responseWithoutMeta } = validResponse;

        const result = TagsResponseSchema.safeParse(responseWithoutMeta);
        expect(result.success).toBe(true);
    });

    it('validates empty tags array', () => {
        const emptyResponse = {
            tags: [],
            meta: validResponse.meta,
        };

        const result = TagsResponseSchema.safeParse(emptyResponse);
        expect(result.success).toBe(true);
    });
});

describe('TagResponseSchema', () => {
    it('validates single tag response', () => {
        const response = {
            tags: [
                {
                    id: '507f1f77bcf86cd799439011',
                    name: 'Tag 1',
                    slug: 'tag-1',
                    url: 'http://localhost:2368/tag/tag-1/',
                    description: null,
                    visibility: 'public' as const,
                    meta_title: null,
                    meta_description: null,
                    twitter_image: null,
                    twitter_title: null,
                    twitter_description: null,
                    og_image: null,
                    og_title: null,
                    og_description: null,
                    codeinjection_head: null,
                    codeinjection_foot: null,
                    canonical_url: null,
                    accent_color: null,
                    feature_image: null,
                    created_at: '2023-01-01T00:00:00.000Z',
                    updated_at: '2023-01-01T00:00:00.000Z',
                },
            ],
        };

        const result = TagResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
    });

    it('rejects response with multiple tags', () => {
        const response = {
            tags: [
                {
                    id: '507f1f77bcf86cd799439011',
                    name: 'Tag 1',
                    slug: 'tag-1',
                    url: 'http://localhost:2368/tag/tag-1/',
                    description: null,
                    visibility: 'public' as const,
                    meta_title: null,
                    meta_description: null,
                    twitter_image: null,
                    twitter_title: null,
                    twitter_description: null,
                    og_image: null,
                    og_title: null,
                    og_description: null,
                    codeinjection_head: null,
                    codeinjection_foot: null,
                    canonical_url: null,
                    accent_color: null,
                    feature_image: null,
                    created_at: '2023-01-01T00:00:00.000Z',
                    updated_at: '2023-01-01T00:00:00.000Z',
                },
                {
                    id: '507f1f77bcf86cd799439012',
                    name: 'Tag 2',
                    slug: 'tag-2',
                    url: 'http://localhost:2368/tag/tag-2/',
                    description: null,
                    visibility: 'public' as const,
                    meta_title: null,
                    meta_description: null,
                    twitter_image: null,
                    twitter_title: null,
                    twitter_description: null,
                    og_image: null,
                    og_title: null,
                    og_description: null,
                    codeinjection_head: null,
                    codeinjection_foot: null,
                    canonical_url: null,
                    accent_color: null,
                    feature_image: null,
                    created_at: '2023-01-01T00:00:00.000Z',
                    updated_at: '2023-01-01T00:00:00.000Z',
                },
            ],
        };

        const result = TagResponseSchema.safeParse(response);
        expect(result.success).toBe(false);
    });
});

describe('TagCreateSchema', () => {
    it('validates tag creation data', () => {
        const createData = {
            name: 'New Tag',
            slug: 'new-tag',
            description: 'A new tag',
            visibility: 'public' as const,
            meta_title: null,
            meta_description: null,
            twitter_image: null,
            twitter_title: null,
            twitter_description: null,
            og_image: null,
            og_title: null,
            og_description: null,
            codeinjection_head: null,
            codeinjection_foot: null,
            canonical_url: null,
            accent_color: null,
            feature_image: null,
        };

        const result = TagCreateSchema.safeParse(createData);
        expect(result.success).toBe(true);
    });

    it('rejects extra fields like id (strict validation)', () => {
        const createDataWithId = {
            id: '507f1f77bcf86cd799439011',
            name: 'New Tag',
            slug: 'new-tag',
            description: null,
            visibility: 'public' as const,
            meta_title: null,
            meta_description: null,
            twitter_image: null,
            twitter_title: null,
            twitter_description: null,
            og_image: null,
            og_title: null,
            og_description: null,
            codeinjection_head: null,
            codeinjection_foot: null,
            canonical_url: null,
            accent_color: null,
            feature_image: null,
        };

        // Schema uses .strict() to reject extra fields (matches Ghost SDK behavior)
        const result = TagCreateSchema.safeParse(createDataWithId);
        expect(result.success).toBe(false);
        
        // Without the id field, it should pass
        const { id, ...createData } = createDataWithId;
        const validResult = TagCreateSchema.safeParse(createData);
        expect(validResult.success).toBe(true);
    });
});

describe('TagUpdateSchema', () => {
    it('validates partial tag update with id', () => {
        const updateData = {
            id: '507f1f77bcf86cd799439011',
            name: 'Updated Name',
            description: 'Updated description',
        };

        const result = TagUpdateSchema.safeParse(updateData);
        expect(result.success).toBe(true);
    });

    it('rejects update without id', () => {
        const updateData = {
            name: 'Updated Name',
        };

        const result = TagUpdateSchema.safeParse(updateData);
        expect(result.success).toBe(false);
    });
});
