import type {ContentRepository, PostOrder, PublishedPostFilter} from './repo.js';
import type {AuthorProfileRecord, PostRecord, TagRecord} from './db.js';

export type FrontendEntry = {
    post: PostRecord;
    tags: TagRecord[];
    authors: AuthorProfileRecord[];
};

export type FrontendPagination = {
    page: number;
    limit: number;
    pages: number;
    total: number;
    next: number | null;
    prev: number | null;
};

export type FrontendContentReader = {
    getEntryBySlug: (slug: string) => Promise<FrontendEntry | null>;
    // Any-status lookups for the admin surfaces.
    getEntryById: (id: string) => Promise<FrontendEntry | null>;
    // Any-status lookup for /p/<uuid> draft previews.
    getEntryByUuid: (uuid: string) => Promise<FrontendEntry | null>;
    isSlugTaken: (slug: string) => Promise<boolean>;
    listPublished: (options: {page: number; limit: number; filter?: PublishedPostFilter; order?: PostOrder}) => Promise<{entries: FrontendEntry[]; pagination: FrontendPagination}>;
    getTagBySlug: (slug: string) => Promise<TagRecord | null>;
    getAuthorBySlug: (slug: string) => Promise<AuthorProfileRecord | null>;
    listTags: () => Promise<TagRecord[]>;
    listTagsWithCounts: () => Promise<Array<{tag: TagRecord; postCount: number}>>;
    listAuthors: () => Promise<AuthorProfileRecord[]>;
};

// Read model for the public site: full records with tags/authors attached,
// distinct from the admin-facing content service DTOs.
export const createFrontendContentReader = (repository: ContentRepository): FrontendContentReader => {
    const attach = async (posts: PostRecord[]): Promise<FrontendEntry[]> => {
        const postIds = posts.map((post) => post.id);
        const [tagsByPost, authorsByPost] = await Promise.all([
            repository.getTagsForPosts(postIds),
            repository.getAuthorsForPosts(postIds)
        ]);
        return posts.map((post) => ({
            post,
            tags: tagsByPost.get(post.id) ?? [],
            authors: authorsByPost.get(post.id) ?? []
        }));
    };

    const getEntryById = async (id: string) => {
        const post = await repository.getPostById(id);
        if (!post) {
            return null;
        }
        const [entry] = await attach([post]);
        return entry ?? null;
    };

    const getEntryByUuid = async (uuid: string) => {
        const post = await repository.getPostByUuid(uuid);
        if (!post) {
            return null;
        }
        const [entry] = await attach([post]);
        return entry ?? null;
    };

    const isSlugTaken = async (slug: string) => {
        return Boolean(await repository.getPostBySlug(slug));
    };

    const getEntryBySlug = async (slug: string) => {
        const post = await repository.getPostBySlug(slug);
        if (!post || post.status !== 'published') {
            return null;
        }
        const [entry] = await attach([post]);
        return entry ?? null;
    };

    const listPublished = async ({page, limit, filter, order}: {page: number; limit: number; filter?: PublishedPostFilter; order?: PostOrder}) => {
        const offset = (page - 1) * limit;
        const {posts, total} = await repository.listAndCountPublishedPosts(
            {limit, offset, ...(filter ? {filter} : {}), ...(order ? {order} : {})}
        );
        const pages = Math.max(1, Math.ceil(total / limit));
        const pagination: FrontendPagination = {
            page,
            limit,
            pages,
            total,
            next: page < pages ? page + 1 : null,
            prev: page > 1 ? page - 1 : null
        };
        return {entries: await attach(posts), pagination};
    };

    return {
        getEntryBySlug,
        getEntryById,
        getEntryByUuid,
        isSlugTaken,
        listPublished,
        getTagBySlug: (slug: string) => repository.getTagBySlug(slug),
        getAuthorBySlug: (slug: string) => repository.getAuthorProfileBySlug(slug),
        listTags: () => repository.listTags(),
        listTagsWithCounts: async () => {
            const [tags, counts] = await Promise.all([
                repository.listTags(),
                repository.countPostsPerTag()
            ]);
            return tags.map((tag) => ({tag, postCount: counts.get(tag.id) ?? 0}));
        },
        listAuthors: () => repository.listAuthorProfiles()
    };
};
