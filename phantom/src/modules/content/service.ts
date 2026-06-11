import {randomUUID} from 'node:crypto';
import type {ContentRepository} from './repo.js';
import type {
    PostCreateRequest,
    PostCreateResponse,
    PostResponse,
    PostUpdateRequest,
    PostUpdateResponse,
    CollectionCreateRequest,
    CollectionListResponse,
    CollectionResponse,
    AuthorProfileCreateRequest,
    AuthorProfileListResponse,
    AuthorProfileResponse,
    TagCreateRequest,
    TagCreateResponse
} from './contracts.js';
import {HttpError} from '../../platform/http/errors.js';

type PublishedPostsResult = {
    posts: PostResponse['post'][];
    pagination: {
        page: number;
        limit: number;
        pages: number;
        total: number;
    };
};

export type ContentService = {
    createPost: (input: PostCreateRequest, editorId: string) => Promise<PostCreateResponse>;
    getPost: (id: string) => Promise<PostResponse>;
    getPostBySlug: (slug: string) => Promise<PostResponse>;
    listPublishedPosts: (options: {page: number; limit: number}) => Promise<PublishedPostsResult>;
    updatePost: (id: string, input: PostUpdateRequest, editorId: string) => Promise<PostUpdateResponse>;
    deletePost: (id: string, editorId: string) => Promise<void>;
    createTag: (input: TagCreateRequest) => Promise<TagCreateResponse>;
    createCollection: (input: CollectionCreateRequest) => Promise<CollectionResponse>;
    listCollections: () => Promise<CollectionListResponse>;
    createAuthorProfile: (input: AuthorProfileCreateRequest) => Promise<AuthorProfileResponse>;
    listAuthorProfiles: () => Promise<AuthorProfileListResponse>;
};

export const createContentService = (repository: ContentRepository): ContentService => {
    const slugify = (value: string) => value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 191) || randomUUID();

    const ensureLexicalPayload = (payload: unknown) => {
        if (!payload || typeof payload !== 'object') {
            return {root: {type: 'root', children: [], version: 1}};
        }

        const root = (payload as {root?: {children?: unknown}}).root;
        if (!root || !Array.isArray(root.children)) {
            throw new HttpError(422, 'invalid_lexical', 'Lexical payload is invalid');
        }

        return payload as Record<string, unknown>;
    };

    const buildPostResponse = (post: {
        id: string;
        title: string;
        slug: string;
        status: string;
        publishedAt: number | null;
        createdAt: number;
        updatedAt: number;
        lexical: string;
        visibility: string;
        customExcerpt: string | null;
        featureImage: string | null;
        featureImageAlt: string | null;
        featureImageCaption: string | null;
    }) => {
        const status: 'draft' | 'published' | 'scheduled' = post.status === 'published'
            ? 'published'
            : post.status === 'scheduled'
                ? 'scheduled'
                : 'draft';
        const visibility: 'public' | 'members' | 'paid' = post.visibility === 'members' || post.visibility === 'paid'
            ? post.visibility
            : 'public';

        return {
            post: {
                id: post.id,
                title: post.title,
                slug: post.slug,
                status,
                lexical: JSON.parse(post.lexical) as Record<string, unknown>,
                visibility,
                customExcerpt: post.customExcerpt ?? null,
                featureImage: post.featureImage ?? null,
                featureImageAlt: post.featureImageAlt ?? null,
                featureImageCaption: post.featureImageCaption ?? null,
                publishedAt: post.publishedAt ?? null,
                createdAt: post.createdAt,
                updatedAt: post.updatedAt
            }
        };
    };

    const createPost = async (input: PostCreateRequest, editorId: string) => {
        const now = Date.now();
        const status = input.status;
        const publishedAt = status === 'published' ? now : input.publishedAt ?? null;
        if (status === 'scheduled' && !input.publishedAt) {
            throw new HttpError(422, 'scheduled_requires_date', 'Scheduled posts require publishedAt');
        }

        const lexical = ensureLexicalPayload(input.lexical);
        const slug = input.slug ? slugify(input.slug) : slugify(input.title);

        const post = await repository.createPost({
            id: randomUUID(),
            type: input.type ?? 'post',
            title: input.title,
            slug,
            status,
            lexical: JSON.stringify(lexical),
            visibility: input.visibility ?? 'public',
            customExcerpt: input.customExcerpt ?? null,
            featureImage: input.featureImage ?? null,
            featureImageAlt: input.featureImageAlt ?? null,
            featureImageCaption: input.featureImageCaption ?? null,
            publishedAt,
            createdAt: now,
            updatedAt: now
        });

        await repository.createRevision({
            id: randomUUID(),
            postId: post.id,
            title: post.title,
            slug: post.slug,
            status: post.status,
            lexical: post.lexical,
            visibility: post.visibility,
            customExcerpt: post.customExcerpt,
            featureImage: post.featureImage,
            featureImageAlt: post.featureImageAlt,
            featureImageCaption: post.featureImageCaption,
            editorId,
            reason: input.reason ?? null,
            createdAt: now
        });

        await repository.createContentEvent({
            id: randomUUID(),
            postId: post.id,
            type: 'post.created',
            payload: JSON.stringify({status: post.status}),
            createdAt: now
        });

        if (post.status === 'published') {
            const url = `/posts/${post.slug}`;
            await repository.createContentEvent({
                id: randomUUID(),
                postId: post.id,
                type: 'post.published',
                payload: JSON.stringify({url}),
                createdAt: now
            });
            await repository.createContentUrlEvent({
                id: randomUUID(),
                postId: post.id,
                action: 'publish',
                url,
                createdAt: now
            });
        }

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

        return buildPostResponse(post);
    };

    const getPost = async (id: string) => {
        const post = await repository.getPostById(id);
        if (!post) {
            throw new HttpError(404, 'post_not_found', 'Post not found');
        }

        return buildPostResponse(post);
    };

    const getPostBySlug = async (slug: string) => {
        const post = await repository.getPostBySlug(slug);
        if (!post) {
            throw new HttpError(404, 'post_not_found', 'Post not found');
        }
        return buildPostResponse(post);
    };

    const listPublishedPosts = async ({page, limit}: {page: number; limit: number}) => {
        const safePage = page < 1 ? 1 : page;
        const safeLimit = limit < 1 ? 1 : limit;
        const offset = (safePage - 1) * safeLimit;
        const [posts, total] = await Promise.all([
            repository.listPublishedPosts({limit: safeLimit, offset}),
            repository.countPublishedPosts()
        ]);
        const pages = Math.max(1, Math.ceil(total / safeLimit));
        return {
            posts: posts.map((post) => buildPostResponse(post).post),
            pagination: {
                page: safePage,
                limit: safeLimit,
                pages,
                total
            }
        };
    };

    const updatePost = async (id: string, input: PostUpdateRequest, editorId: string) => {
        const existing = await repository.getPostById(id);
        if (!existing) {
            throw new HttpError(404, 'post_not_found', 'Post not found');
        }

        const status = input.status ?? existing.status;
        const publishedAt = status === 'published'
            ? input.publishedAt ?? existing.publishedAt ?? Date.now()
            : status === 'scheduled'
                ? input.publishedAt ?? existing.publishedAt
                : null;
        if (status === 'scheduled' && !publishedAt) {
            throw new HttpError(422, 'scheduled_requires_date', 'Scheduled posts require publishedAt');
        }

        const lexical = input.lexical ? ensureLexicalPayload(input.lexical) : JSON.parse(existing.lexical);
        const slug = input.slug ? slugify(input.slug) : existing.slug;
        const now = Date.now();
        const updated = await repository.updatePost({
            ...existing,
            // Stored html snapshots (from import) go stale the moment the
            // lexical source changes; renderers fall back to lexical.
            html: input.lexical ? null : existing.html,
            title: input.title ?? existing.title,
            slug,
            status,
            lexical: JSON.stringify(lexical),
            visibility: input.visibility ?? existing.visibility,
            // Explicit null clears nullable fields; only undefined keeps them.
            customExcerpt: input.customExcerpt !== undefined ? input.customExcerpt : existing.customExcerpt,
            featureImage: input.featureImage !== undefined ? input.featureImage : existing.featureImage,
            featureImageAlt: input.featureImageAlt !== undefined ? input.featureImageAlt : existing.featureImageAlt,
            featureImageCaption: input.featureImageCaption !== undefined ? input.featureImageCaption : existing.featureImageCaption,
            publishedAt,
            updatedAt: now
        });

        await repository.createRevision({
            id: randomUUID(),
            postId: updated.id,
            title: updated.title,
            slug: updated.slug,
            status: updated.status,
            lexical: updated.lexical,
            visibility: updated.visibility,
            customExcerpt: updated.customExcerpt,
            featureImage: updated.featureImage,
            featureImageAlt: updated.featureImageAlt,
            featureImageCaption: updated.featureImageCaption,
            editorId,
            reason: input.reason ?? null,
            createdAt: now
        });

        await repository.createContentEvent({
            id: randomUUID(),
            postId: updated.id,
            type: 'post.updated',
            payload: JSON.stringify({status: updated.status}),
            createdAt: now
        });

        if (existing.status !== 'published' && updated.status === 'published') {
            const url = `/posts/${updated.slug}`;
            await repository.createContentEvent({
                id: randomUUID(),
                postId: updated.id,
                type: 'post.published',
                payload: JSON.stringify({url}),
                createdAt: now
            });
            await repository.createContentUrlEvent({
                id: randomUUID(),
                postId: updated.id,
                action: 'publish',
                url,
                createdAt: now
            });
        }

        if (existing.status === 'published' && updated.status !== 'published') {
            const url = `/posts/${existing.slug}`;
            await repository.createContentEvent({
                id: randomUUID(),
                postId: updated.id,
                type: 'post.unpublished',
                payload: JSON.stringify({url}),
                createdAt: now
            });
            await repository.createContentUrlEvent({
                id: randomUUID(),
                postId: updated.id,
                action: 'unpublish',
                url,
                createdAt: now
            });
        }

        if (existing.slug !== updated.slug && updated.status === 'published') {
            await repository.createContentRedirect({
                id: randomUUID(),
                postId: updated.id,
                fromUrl: `/posts/${existing.slug}`,
                toUrl: `/posts/${updated.slug}`,
                createdAt: now
            });
            await repository.createContentUrlEvent({
                id: randomUUID(),
                postId: updated.id,
                action: 'redirect',
                url: `/posts/${updated.slug}`,
                createdAt: now
            });
        }

        if (input.tags) {
            for (const tagSlug of input.tags) {
                const existingTag = await repository.getTagBySlug(tagSlug);
                const tag = existingTag ?? await repository.createTag({
                    id: randomUUID(),
                    name: tagSlug,
                    slug: tagSlug
                });
                await repository.linkTagToPost(updated.id, tag.id);
            }
        }

        return buildPostResponse(updated);
    };

    const deletePost = async (id: string, editorId: string) => {
        const existing = await repository.getPostById(id);
        if (!existing) {
            throw new HttpError(404, 'post_not_found', 'Post not found');
        }

        await repository.deletePost(id);
        const now = Date.now();
        await repository.createContentEvent({
            id: randomUUID(),
            postId: existing.id,
            type: 'post.deleted',
            payload: JSON.stringify({slug: existing.slug}),
            createdAt: now
        });

        await repository.createRevision({
            id: randomUUID(),
            postId: existing.id,
            title: existing.title,
            slug: existing.slug,
            status: existing.status,
            lexical: existing.lexical,
            editorId,
            reason: 'deleted',
            createdAt: now
        });

        await repository.createContentUrlEvent({
            id: randomUUID(),
            postId: existing.id,
            action: 'delete',
            url: `/posts/${existing.slug}`,
            createdAt: now
        });
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

    const createCollection = async (input: CollectionCreateRequest) => {
        const existing = await repository.getCollectionBySlug(input.slug);
        if (existing) {
            throw new HttpError(422, 'collection_exists', 'Collection slug already exists');
        }

        const collection = await repository.createCollection({
            id: randomUUID(),
            name: input.name,
            slug: input.slug,
            filter: input.filter
        });

        return {
            collection: {
                id: collection.id,
                name: collection.name,
                slug: collection.slug,
                filter: collection.filter
            }
        };
    };

    const listCollections = async () => {
        const collections = await repository.listCollections();
        return {
            collections: collections.map((collection) => ({
                id: collection.id,
                name: collection.name,
                slug: collection.slug,
                filter: collection.filter
            }))
        };
    };

    const createAuthorProfile = async (input: AuthorProfileCreateRequest) => {
        const existing = await repository.getAuthorProfileBySlug(input.slug);
        if (existing) {
            throw new HttpError(422, 'author_exists', 'Author slug already exists');
        }

        const author = await repository.createAuthorProfile({
            id: randomUUID(),
            name: input.name,
            slug: input.slug,
            bio: input.bio ?? null
        });

        return {
            author: {
                id: author.id,
                name: author.name,
                slug: author.slug,
                bio: author.bio ?? null
            }
        };
    };

    const listAuthorProfiles = async () => {
        const authors = await repository.listAuthorProfiles();
        return {
            authors: authors.map((author) => ({
                id: author.id,
                name: author.name,
                slug: author.slug,
                bio: author.bio ?? null
            }))
        };
    };

    return {
        createPost,
        getPost,
        getPostBySlug,
        listPublishedPosts,
        updatePost,
        deletePost,
        createTag,
        createCollection,
        listCollections,
        createAuthorProfile,
        listAuthorProfiles
    };
};
