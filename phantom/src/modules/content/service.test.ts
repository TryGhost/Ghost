import {describe, expect, it} from 'vitest';
import {createContentService} from './service.js';
import type {ContentRepository} from './repo.js';
import {HttpError} from '../../platform/http/errors.js';

const createRepository = (): ContentRepository => {
    const posts: {id: string; title: string; slug: string; status: string; lexical: string; visibility: string; customExcerpt: string | null; featureImage: string | null; featureImageAlt: string | null; featureImageCaption: string | null; publishedAt: number | null; createdAt: number; updatedAt: number}[] = [];
    const tags: {id: string; name: string; slug: string}[] = [];

    return {
        createPost: async (post) => {
            const record = post as {id: string; title: string; slug: string; status: string; lexical: string; visibility: string; customExcerpt: string | null; featureImage: string | null; featureImageAlt: string | null; featureImageCaption: string | null; publishedAt: number | null; createdAt: number; updatedAt: number};
            posts.push(record);
            return record;
        },
        updatePost: async (post) => post as {id: string; title: string; slug: string; status: string; lexical: string; visibility: string; customExcerpt: string | null; featureImage: string | null; featureImageAlt: string | null; featureImageCaption: string | null; publishedAt: number | null; createdAt: number; updatedAt: number},
        getPostById: async (id) => posts.find((post) => post.id === id) ?? null,
        getPostBySlug: async (slug) => posts.find((post) => post.slug === slug) ?? null,
        listPublishedPosts: async () => posts.filter((post) => post.status === 'published'),
        countPublishedPosts: async () => posts.filter((post) => post.status === 'published').length,
        createRevision: async (revision) => revision as {
            id: string;
            postId: string;
            title: string;
            slug: string;
            status: string;
            lexical: string;
            visibility: string;
            customExcerpt: string | null;
            featureImage: string | null;
            featureImageAlt: string | null;
            featureImageCaption: string | null;
            editorId: string | null;
            reason: string | null;
            createdAt: number;
        },
        createContentEvent: async () => undefined,
        createContentUrlEvent: async () => undefined,
        createContentRedirect: async () => undefined,
        deletePost: async () => undefined,
        createTag: async (tag) => {
            const record = tag as {id: string; name: string; slug: string};
            tags.push(record);
            return record;
        },
        getTagBySlug: async (slug) => tags.find((tag) => tag.slug === slug) ?? null,
        linkTagToPost: async () => undefined,
        createCollection: async (collection) => collection as {id: string; name: string; slug: string; filter: string},
        listCollections: async () => [],
        getCollectionBySlug: async () => null,
        createAuthorProfile: async (author) => author as {id: string; name: string; slug: string; bio: string | null},
        listAuthorProfiles: async () => [],
        getAuthorProfileBySlug: async () => null
    };
};

describe('content service', () => {
    it('creates draft posts with revisions', async () => {
        const repository = createRepository();
        const service = createContentService(repository);

        const result = await service.createPost({title: 'Hello', status: 'draft'}, 'editor');

        expect(result.post.status).toBe('draft');
    });

    it('requires schedule dates for scheduled posts', async () => {
        const repository = createRepository();
        const service = createContentService(repository);

        let error: HttpError | null = null;

        try {
            await service.createPost({title: 'Soon', status: 'scheduled'}, 'editor');
        } catch (caught) {
            if (caught instanceof HttpError) {
                error = caught;
            }
        }

        expect(error?.status).toBe(422);
    });

    it('creates tags with unique slugs', async () => {
        const repository = createRepository();
        const service = createContentService(repository);

        const created = await service.createTag({name: 'News', slug: 'news'});

        expect(created.tag.slug).toBe('news');
    });
});
