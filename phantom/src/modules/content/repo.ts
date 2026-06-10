import {and, count, desc, eq, inArray, sql} from 'drizzle-orm';
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
    // 'all' lifts the published-only restriction (admin browse).
    status?: 'published' | 'all';
};

export type ContentRepository = {
    createPost: (post: NewPostRecord) => Promise<PostRecord>;
    updatePost: (post: PostRecord) => Promise<PostRecord>;
    getPostById: (id: string) => Promise<PostRecord | null>;
    getPostBySlug: (slug: string) => Promise<PostRecord | null>;
    listPublishedPosts: (options: {limit: number; offset: number; filter?: PublishedPostFilter}) => Promise<PostRecord[]>;
    countPublishedPosts: (filter?: PublishedPostFilter) => Promise<number>;
    listAndCountPublishedPosts: (options: {limit: number; offset: number; filter?: PublishedPostFilter}) => Promise<{posts: PostRecord[]; total: number}>;
    getTagsForPosts: (postIds: string[]) => Promise<Map<string, TagRecord[]>>;
    getAuthorsForPosts: (postIds: string[]) => Promise<Map<string, AuthorProfileRecord[]>>;
    deletePost: (id: string) => Promise<void>;
    createRevision: (revision: NewPostRevisionRecord) => Promise<PostRevisionRecord>;
    createContentEvent: (event: NewContentEventRecord) => Promise<void>;
    createContentUrlEvent: (event: NewContentUrlEventRecord) => Promise<void>;
    createContentRedirect: (redirect: NewContentRedirectRecord) => Promise<void>;
    createTag: (tag: NewTagRecord) => Promise<TagRecord>;
    listTags: () => Promise<TagRecord[]>;
    getTagBySlug: (slug: string) => Promise<TagRecord | null>;
    linkTagToPost: (postId: string, tagId: string) => Promise<void>;
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
        const conditions = filter?.status === 'all' ? [] : [eq(postTable.status, 'published')];
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
        return conditions.length > 0 ? and(...conditions) : sql`1 = 1`;
    };

    const listPublishedPosts = async ({limit, offset, filter}: {limit: number; offset: number; filter?: PublishedPostFilter}) => {
        const where = await buildPublishedWhere(filter);
        if (!where) {
            return [];
        }
        return db
            .select()
            .from(postTable)
            .where(where)
            .orderBy(desc(postTable.publishedAt))
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

    const listAndCountPublishedPosts = async ({limit, offset, filter}: {limit: number; offset: number; filter?: PublishedPostFilter}) => {
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
                .orderBy(desc(postTable.publishedAt))
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

    const getTagBySlug = async (slug: string) => {
        const rows = await db.select().from(tagTable).where(eq(tagTable.slug, slug)).limit(1);
        return rows[0] ?? null;
    };

    const linkTagToPost = async (postId: string, tagId: string) => {
        await db.insert(postTagTable).values({postId, tagId});
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
        getTagBySlug,
        linkTagToPost,
        createCollection,
        listCollections,
        getCollectionBySlug,
        createAuthorProfile,
        listAuthorProfiles,
        getAuthorProfileBySlug
    };
};
