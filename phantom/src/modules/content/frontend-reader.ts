import type {ContentRepository, PublishedPostFilter} from './repo.js';
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
    listPublished: (options: {page: number; limit: number; filter?: PublishedPostFilter}) => Promise<{entries: FrontendEntry[]; pagination: FrontendPagination}>;
    getTagBySlug: (slug: string) => Promise<TagRecord | null>;
    getAuthorBySlug: (slug: string) => Promise<AuthorProfileRecord | null>;
    listTags: () => Promise<TagRecord[]>;
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

    const getEntryBySlug = async (slug: string) => {
        const post = await repository.getPostBySlug(slug);
        if (!post || post.status !== 'published') {
            return null;
        }
        const [entry] = await attach([post]);
        return entry ?? null;
    };

    const listPublished = async ({page, limit, filter}: {page: number; limit: number; filter?: PublishedPostFilter}) => {
        const offset = (page - 1) * limit;
        const {posts, total} = await repository.listAndCountPublishedPosts(
            filter ? {limit, offset, filter} : {limit, offset}
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
        listPublished,
        getTagBySlug: (slug: string) => repository.getTagBySlug(slug),
        getAuthorBySlug: (slug: string) => repository.getAuthorProfileBySlug(slug),
        listTags: () => repository.listTags(),
        listAuthors: () => repository.listAuthorProfiles()
    };
};
