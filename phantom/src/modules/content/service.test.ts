import {describe, expect, it} from 'vitest';
import {createContentService} from './service.js';
import type {ContentRepository} from './repo.js';
import type {AuthorProfileRecord, CollectionRecord, PostRecord, PostRevisionRecord, TagRecord} from './db.js';
import {HttpError} from '../../platform/http/errors.js';

const createRepository = (): ContentRepository => {
    const posts: PostRecord[] = [];
    const tags: TagRecord[] = [];

    return {
        createPost: async (post) => {
            const record = post as PostRecord;
            posts.push(record);
            return record;
        },
        updatePost: async (post) => post as PostRecord,
        getPostById: async (id) => posts.find((post) => post.id === id) ?? null,
        getPostBySlug: async (slug) => posts.find((post) => post.slug === slug) ?? null,
        listPublishedPosts: async () => posts.filter((post) => post.status === 'published'),
        countPublishedPosts: async () => posts.filter((post) => post.status === 'published').length,
        listAndCountPublishedPosts: async () => {
            const published = posts.filter((post) => post.status === 'published');
            return {posts: published, total: published.length};
        },
        getTagsForPosts: async () => new Map(),
        getAuthorsForPosts: async () => new Map(),
        createRevision: async (revision) => revision as PostRevisionRecord,
        createContentEvent: async () => undefined,
        createContentUrlEvent: async () => undefined,
        createContentRedirect: async () => undefined,
        deletePost: async () => undefined,
        createTag: async (tag) => {
            const record = tag as TagRecord;
            tags.push(record);
            return record;
        },
        getTagBySlug: async (slug) => tags.find((tag) => tag.slug === slug) ?? null,
        listTags: async () => tags,
        linkTagToPost: async () => undefined,
        createCollection: async (collection) => collection as CollectionRecord,
        listCollections: async () => [],
        getCollectionBySlug: async () => null,
        createAuthorProfile: async (author) => author as AuthorProfileRecord,
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
