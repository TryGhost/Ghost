import {describe, expect, it} from 'vitest';
import {createContentService} from './service.js';
import type {ContentRepository} from './repo.js';
import {HttpError} from '../../platform/http/errors.js';

const createRepository = (): ContentRepository => {
    const posts: {id: string; title: string; status: string; publishedAt: number | null; createdAt: number; updatedAt: number}[] = [];
    const tags: {id: string; name: string; slug: string}[] = [];

    return {
        createPost: async (post) => {
            const record = post as {id: string; title: string; status: string; publishedAt: number | null; createdAt: number; updatedAt: number};
            posts.push(record);
            return record;
        },
        getPostById: async (id) => posts.find((post) => post.id === id) ?? null,
        createRevision: async (revision) => revision as {id: string; postId: string; title: string; status: string; createdAt: number},
        createTag: async (tag) => {
            const record = tag as {id: string; name: string; slug: string};
            tags.push(record);
            return record;
        },
        getTagBySlug: async (slug) => tags.find((tag) => tag.slug === slug) ?? null,
        linkTagToPost: async () => undefined
    };
};

describe('content service', () => {
    it('creates draft posts with revisions', async () => {
        const repository = createRepository();
        const service = createContentService(repository);

        const result = await service.createPost({title: 'Hello', status: 'draft'});

        expect(result.post.status).toBe('draft');
    });

    it('requires schedule dates for scheduled posts', async () => {
        const repository = createRepository();
        const service = createContentService(repository);

        let error: HttpError | null = null;

        try {
            await service.createPost({title: 'Soon', status: 'scheduled'});
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
