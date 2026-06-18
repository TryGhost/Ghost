import {and, asc, count, desc, eq, inArray, sql} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    authorProfileTable,
    collectionTable,
    contentEventTable,
    contentRedirectTable,
    contentUrlEventTable,
    postAuthorTable,
    postRevisionTable,
    postTable,
    postTagTable,
    tagTable,
    type AuthorProfileRecord,
    type CollectionRecord,
    type NewAuthorProfileRecord,
    type NewCollectionRecord,
    type NewContentEventRecord,
    type NewContentRedirectRecord,
    type NewContentUrlEventRecord,
    type NewPostRecord,
    type NewPostRevisionRecord,
    type NewTagRecord,
    type PostRecord,
    type PostRevisionRecord,
    type TagRecord
} from './db.js';

export type PublishedPostFilter = {
    type?: 'post' | 'page';
    tagSlug?: string;
    authorSlug?: string;
    // 'all' lifts the published-only restriction (admin browse); an explicit
    // status list serves the admin's draft/scheduled/published tabs.
    status?: 'published' | 'all';
    statuses?: string[];
    visibilities?: string[];
    featured?: boolean;
};

// Admin browse sort orders ("Newest first", "Oldest first", drafts by
// recency). Public listings always use the published_at desc default.
export type PostOrder = 'published_at desc' | 'published_at asc' | 'updated_at desc' | 'updated_at asc';

export type ContentRepository = {
    createPost: (post: NewPostRecord) => Promise<PostRecord>;
    updatePost: (post: PostRecord) => Promise<PostRecord>;
    getPostById: (id: string) => Promise<PostRecord | null>;
    getPostByUuid: (uuid: string) => Promise<PostRecord | null>;
    getPostBySlug: (slug: string) => Promise<PostRecord | null>;
    listPublishedPosts: (options: {limit: number; offset: number; filter?: PublishedPostFilter; order?: PostOrder}) => Promise<PostRecord[]>;
    countPublishedPosts: (filter?: PublishedPostFilter) => Promise<number>;
    listAndCountPublishedPosts: (options: {limit: number; offset: number; filter?: PublishedPostFilter; order?: PostOrder}) => Promise<{posts: PostRecord[]; total: number}>;
    getTagsForPosts: (postIds: string[]) => Promise<Map<string, TagRecord[]>>;
    getAuthorsForPosts: (postIds: string[]) => Promise<Map<string, AuthorProfileRecord[]>>;
    deletePost: (id: string) => Promise<void>;
    createRevision: (revision: NewPostRevisionRecord) => Promise<PostRevisionRecord>;
    createContentEvent: (event: NewContentEventRecord) => Promise<void>;
    createContentUrlEvent: (event: NewContentUrlEventRecord) => Promise<void>;
    createContentRedirect: (redirect: NewContentRedirectRecord) => Promise<void>;
    createTag: (tag: NewTagRecord) => Promise<TagRecord>;
    listTags: () => Promise<TagRecord[]>;
    countPostsPerTag: () => Promise<Map<string, number>>;
    getTagBySlug: (slug: string) => Promise<TagRecord | null>;
    getTagById: (id: string) => Promise<TagRecord | null>;
    updateTag: (tag: TagRecord) => Promise<TagRecord>;
    deleteTag: (id: string) => Promise<void>;
    linkTagToPost: (postId: string, tagId: string) => Promise<void>;
    linkAuthorToPost: (postId: string, authorId: string) => Promise<void>;
    getAuthorProfileById: (id: string) => Promise<AuthorProfileRecord | null>;
    createCollection: (collection: NewCollectionRecord) => Promise<CollectionRecord>;
    listCollections: () => Promise<CollectionRecord[]>;
    getCollectionBySlug: (slug: string) => Promise<CollectionRecord | null>;
    createAuthorProfile: (author: NewAuthorProfileRecord) => Promise<AuthorProfileRecord>;
    listAuthorProfiles: () => Promise<AuthorProfileRecord[]>;
    getAuthorProfileBySlug: (slug: string) => Promise<AuthorProfileRecord | null>;
};

export const createContentRepository = (db: DbClient): ContentRepository => {
    const createPost = async (post: NewPostRecord) => {
        await db.insert(postTable).values(post);
        const rows = await db.select().from(postTable).where(eq(postTable.id, post.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Post missing after insert');
        }
        return rows[0];
    };

    const getPostById = async (id: string) => {
        const rows = await db.select().from(postTable).where(eq(postTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    // Preview links carry the uuid; ids double as uuids for editor-created
    // posts that never got an explicit one.
    const getPostByUuid = async (uuid: string) => {
        const rows = await db.select().from(postTable).where(eq(postTable.uuid, uuid)).limit(1);
        if (rows[0]) {
            return rows[0];
        }
        return getPostById(uuid);
    };

    const getPostBySlug = async (slug: string) => {
        const rows = await db.select().from(postTable).where(eq(postTable.slug, slug)).limit(1);
        return rows[0] ?? null;
    };

    const updatePost = async (post: PostRecord) => {
        const {id, createdAt, ...updatable} = post;
        void createdAt;
        await db
            .update(postTable)
            .set(updatable)
            .where(eq(postTable.id, id));
        const rows = await db.select().from(postTable).where(eq(postTable.id, post.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Post missing after update');
        }
        return rows[0];
    };

    const buildPublishedWhere = async (filter?: PublishedPostFilter) => {
        const conditions = filter?.statuses && filter.statuses.length > 0
            ? [inArray(postTable.status, filter.statuses)]
            : filter?.status === 'all'
                ? []
                : [eq(postTable.status, 'published')];
        if (filter?.type) {
            conditions.push(eq(postTable.type, filter.type));
        }
        if (filter?.tagSlug) {
            const tag = await getTagBySlug(filter.tagSlug);
            if (!tag) {
                return null;
            }
            const links = await db.select().from(postTagTable).where(eq(postTagTable.tagId, tag.id));
            const postIds = links.map((link) => link.postId);
            if (postIds.length === 0) {
                return null;
            }
            conditions.push(inArray(postTable.id, postIds));
        }
        if (filter?.authorSlug) {
            const author = await getAuthorProfileBySlug(filter.authorSlug);
            if (!author) {
                return null;
            }
            const links = await db.select().from(postAuthorTable).where(eq(postAuthorTable.authorId, author.id));
            const postIds = links.map((link) => link.postId);
            if (postIds.length === 0) {
                return null;
            }
            conditions.push(inArray(postTable.id, postIds));
        }
        if (filter?.visibilities && filter.visibilities.length > 0) {
            conditions.push(inArray(postTable.visibility, filter.visibilities));
        }
        if (filter?.featured !== undefined) {
            conditions.push(eq(postTable.featured, filter.featured ? 1 : 0));
        }
        return conditions.length > 0 ? and(...conditions) : sql`1 = 1`;
    };

    const orderColumn = (order?: PostOrder) => {
        const column = order?.startsWith('updated_at') ? postTable.updatedAt : postTable.publishedAt;
        return order?.endsWith('asc') ? asc(column) : desc(column);
    };

    const listPublishedPosts = async ({limit, offset, filter, order}: {limit: number; offset: number; filter?: PublishedPostFilter; order?: PostOrder}) => {
        const where = await buildPublishedWhere(filter);
        if (!where) {
            return [];
        }
        return db
            .select()
            .from(postTable)
            .where(where)
            .orderBy(orderColumn(order))
            .limit(limit)
            .offset(offset);
    };

    const countPublishedPosts = async (filter?: PublishedPostFilter) => {
        const where = await buildPublishedWhere(filter);
        if (!where) {
            return 0;
        }
        const rows = await db
            .select({value: count()})
            .from(postTable)
            .where(where)
            .limit(1);
        return rows[0]?.value ?? 0;
    };

    const listAndCountPublishedPosts = async ({limit, offset, filter, order}: {limit: number; offset: number; filter?: PublishedPostFilter; order?: PostOrder}) => {
        // Resolves the filter (tag/author slug + link lookups) once for both
        // the page query and the total count.
        const where = await buildPublishedWhere(filter);
        if (!where) {
            return {posts: [], total: 0};
        }
        const [posts, countRows] = await Promise.all([
            db
                .select()
                .from(postTable)
                .where(where)
                .orderBy(orderColumn(order))
                .limit(limit)
                .offset(offset),
            db
                .select({value: count()})
                .from(postTable)
                .where(where)
                .limit(1)
        ]);
        return {posts, total: countRows[0]?.value ?? 0};
    };

    const getTagsForPosts = async (postIds: string[]) => {
        const result = new Map<string, TagRecord[]>();
        if (postIds.length === 0) {
            return result;
        }
        const rows = await db
            .select({link: postTagTable, tag: tagTable})
            .from(postTagTable)
            .innerJoin(tagTable, eq(postTagTable.tagId, tagTable.id))
            .where(inArray(postTagTable.postId, postIds))
            .orderBy(postTagTable.sortOrder);
        for (const row of rows) {
            const tags = result.get(row.link.postId) ?? [];
            tags.push(row.tag);
            result.set(row.link.postId, tags);
        }
        return result;
    };

    const getAuthorsForPosts = async (postIds: string[]) => {
        const result = new Map<string, AuthorProfileRecord[]>();
        if (postIds.length === 0) {
            return result;
        }
        const rows = await db
            .select({link: postAuthorTable, author: authorProfileTable})
            .from(postAuthorTable)
            .innerJoin(authorProfileTable, eq(postAuthorTable.authorId, authorProfileTable.id))
            .where(inArray(postAuthorTable.postId, postIds))
            .orderBy(postAuthorTable.sortOrder);
        for (const row of rows) {
            const authors = result.get(row.link.postId) ?? [];
            authors.push(row.author);
            result.set(row.link.postId, authors);
        }
        return result;
    };

    const deletePost = async (id: string) => {
        await db.delete(postTable).where(eq(postTable.id, id));
        await db.delete(postTagTable).where(eq(postTagTable.postId, id));
    };

    const createRevision = async (revision: NewPostRevisionRecord) => {
        await db.insert(postRevisionTable).values(revision);
        const rows = await db.select().from(postRevisionTable).where(eq(postRevisionTable.id, revision.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Revision missing after insert');
        }
        return rows[0];
    };

    const createContentEvent = async (event: NewContentEventRecord) => {
        await db.insert(contentEventTable).values(event);
    };

    const createContentUrlEvent = async (event: NewContentUrlEventRecord) => {
        await db.insert(contentUrlEventTable).values(event);
    };

    const createContentRedirect = async (redirect: NewContentRedirectRecord) => {
        await db.insert(contentRedirectTable).values(redirect);
    };

    const createTag = async (tag: NewTagRecord) => {
        await db.insert(tagTable).values(tag);
        const rows = await db.select().from(tagTable).where(eq(tagTable.id, tag.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Tag missing after insert');
        }
        return rows[0];
    };

    const listTags = async () => {
        return db.select().from(tagTable);
    };

    const countPostsPerTag = async () => {
        const rows = await db
            .select({tagId: postTagTable.tagId, value: count()})
            .from(postTagTable)
            .groupBy(postTagTable.tagId);
        return new Map(rows.map((row) => [row.tagId, row.value]));
    };

    const getTagBySlug = async (slug: string) => {
        const rows = await db.select().from(tagTable).where(eq(tagTable.slug, slug)).limit(1);
        return rows[0] ?? null;
    };

    const getTagById = async (id: string) => {
        const rows = await db.select().from(tagTable).where(eq(tagTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const updateTag = async (tag: TagRecord) => {
        const {id, ...updatable} = tag;
        await db.update(tagTable).set(updatable).where(eq(tagTable.id, id));
        const rows = await db.select().from(tagTable).where(eq(tagTable.id, id)).limit(1);
        if (!rows[0]) {
            throw new Error('Tag missing after update');
        }
        return rows[0];
    };

    const deleteTag = async (id: string) => {
        await db.delete(postTagTable).where(eq(postTagTable.tagId, id));
        await db.delete(tagTable).where(eq(tagTable.id, id));
    };

    const linkTagToPost = async (postId: string, tagId: string) => {
        await db.insert(postTagTable).values({postId, tagId});
    };

    const linkAuthorToPost = async (postId: string, authorId: string) => {
        await db.insert(postAuthorTable).values({postId, authorId});
    };

    const getAuthorProfileById = async (id: string) => {
        const rows = await db.select().from(authorProfileTable).where(eq(authorProfileTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createCollection = async (collection: NewCollectionRecord) => {
        await db.insert(collectionTable).values(collection);
        const rows = await db.select().from(collectionTable).where(eq(collectionTable.id, collection.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Collection missing after insert');
        }
        return rows[0];
    };

    const listCollections = async () => {
        return db.select().from(collectionTable);
    };

    const getCollectionBySlug = async (slug: string) => {
        const rows = await db.select().from(collectionTable).where(eq(collectionTable.slug, slug)).limit(1);
        return rows[0] ?? null;
    };

    const createAuthorProfile = async (author: NewAuthorProfileRecord) => {
        await db.insert(authorProfileTable).values(author);
        const rows = await db.select().from(authorProfileTable).where(eq(authorProfileTable.id, author.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Author profile missing after insert');
        }
        return rows[0];
    };

    const listAuthorProfiles = async () => {
        return db.select().from(authorProfileTable);
    };

    const getAuthorProfileBySlug = async (slug: string) => {
        const rows = await db.select().from(authorProfileTable).where(eq(authorProfileTable.slug, slug)).limit(1);
        return rows[0] ?? null;
    };

    return {
        createPost,
        updatePost,
        getPostById,
        getPostByUuid,
        getPostBySlug,
        listPublishedPosts,
        countPublishedPosts,
        listAndCountPublishedPosts,
        getTagsForPosts,
        getAuthorsForPosts,
        deletePost,
        createRevision,
        createContentEvent,
        createContentUrlEvent,
        createContentRedirect,
        createTag,
        listTags,
        countPostsPerTag,
        getTagBySlug,
        getTagById,
        updateTag,
        deleteTag,
        linkTagToPost,
        linkAuthorToPost,
        getAuthorProfileById,
        createCollection,
        listCollections,
        getCollectionBySlug,
        createAuthorProfile,
        listAuthorProfiles,
        getAuthorProfileBySlug
    };
};
