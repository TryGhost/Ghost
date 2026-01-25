import {randomUUID} from 'node:crypto';
import type {ContentRepository} from './repo.js';
import type {
    PostCreateRequest,
    PostCreateResponse,
    PostResponse,
    TagCreateRequest,
    TagCreateResponse
} from './contracts.js';
import {HttpError} from '../../platform/http/errors.js';

export type ContentService = {
    createPost: (input: PostCreateRequest) => Promise<PostCreateResponse>;
    getPost: (id: string) => Promise<PostResponse>;
    createTag: (input: TagCreateRequest) => Promise<TagCreateResponse>;
};

export const createContentService = (repository: ContentRepository): ContentService => {
    const createPost = async (input: PostCreateRequest) => {
        const now = Date.now();
        const publishedAt = input.status === 'published' ? now : input.publishedAt ?? null;
        if (input.status === 'scheduled' && !input.publishedAt) {
            throw new HttpError(422, 'scheduled_requires_date', 'Scheduled posts require publishedAt');
        }

        const status = input.status;

        const post = await repository.createPost({
            id: randomUUID(),
            title: input.title,
            status: input.status,
            publishedAt,
            createdAt: now,
            updatedAt: now
        });

        await repository.createRevision({
            id: randomUUID(),
            postId: post.id,
            title: post.title,
            status: post.status,
            createdAt: now
        });

        if (input.tags) {
            for (const slug of input.tags) {
                const existing = await repository.getTagBySlug(slug);
                const tag = existing ?? await repository.createTag({
                    id: randomUUID(),
                    name: slug,
                    slug
                });
                await repository.linkTagToPost(post.id, tag.id);
            }
        }

        return {
            post: {
                id: post.id,
                title: post.title,
                status,
                publishedAt: post.publishedAt,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt
            }
        };
    };

    const getPost = async (id: string) => {
        const post = await repository.getPostById(id);
        if (!post) {
            throw new HttpError(404, 'post_not_found', 'Post not found');
        }

        const status: 'draft' | 'published' | 'scheduled' = post.status === 'published'
            ? 'published'
            : post.status === 'scheduled'
                ? 'scheduled'
                : 'draft';

        return {
            post: {
                id: post.id,
                title: post.title,
                status,
                publishedAt: post.publishedAt ?? null,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt
            }
        };
    };

    const createTag = async (input: TagCreateRequest) => {
        const existing = await repository.getTagBySlug(input.slug);
        if (existing) {
            throw new HttpError(422, 'tag_exists', 'Tag slug already exists');
        }

        const tag = await repository.createTag({
            id: randomUUID(),
            name: input.name,
            slug: input.slug
        });

        return {
            tag: {
                id: tag.id,
                name: tag.name,
                slug: tag.slug
            }
        };
    };

    return {
        createPost,
        getPost,
        createTag
    };
};
