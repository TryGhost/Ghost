import {count, desc, eq, sql} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    authorProfileTable,
    collectionTable,
    contentEventTable,
    contentRedirectTable,
    contentUrlEventTable,
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

export type ContentRepository = {
    createPost: (post: NewPostRecord) => Promise<PostRecord>;
    updatePost: (post: PostRecord) => Promise<PostRecord>;
    getPostById: (id: string) => Promise<PostRecord | null>;
    getPostBySlug: (slug: string) => Promise<PostRecord | null>;
    listPublishedPosts: (options: {limit: number; offset: number}) => Promise<PostRecord[]>;
    countPublishedPosts: () => Promise<number>;
    deletePost: (id: string) => Promise<void>;
    createRevision: (revision: NewPostRevisionRecord) => Promise<PostRevisionRecord>;
    createContentEvent: (event: NewContentEventRecord) => Promise<void>;
    createContentUrlEvent: (event: NewContentUrlEventRecord) => Promise<void>;
    createContentRedirect: (redirect: NewContentRedirectRecord) => Promise<void>;
    createTag: (tag: NewTagRecord) => Promise<TagRecord>;
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
    let schemaEnsured = false;

    const ensureSchema = async () => {
        if (schemaEnsured) {
            return;
        }
        const postColumns = await db.all(sql.raw('PRAGMA table_info(posts)')) as Array<{name: string}>;
        if (postColumns.length === 0) {
            schemaEnsured = true;
            return;
        }
        const columnNames = new Set(postColumns.map((column) => column.name));
        const statements = [];
        if (!columnNames.has('visibility')) {
            statements.push(`ALTER TABLE posts ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'`);
        }
        if (!columnNames.has('custom_excerpt')) {
            statements.push('ALTER TABLE posts ADD COLUMN custom_excerpt TEXT');
        }
        if (!columnNames.has('feature_image')) {
            statements.push('ALTER TABLE posts ADD COLUMN feature_image TEXT');
        }
        if (!columnNames.has('feature_image_alt')) {
            statements.push('ALTER TABLE posts ADD COLUMN feature_image_alt TEXT');
        }
        if (!columnNames.has('feature_image_caption')) {
            statements.push('ALTER TABLE posts ADD COLUMN feature_image_caption TEXT');
        }

        const revisionColumns = await db.all(sql.raw('PRAGMA table_info(post_revisions)')) as Array<{name: string}>;
        if (revisionColumns.length > 0) {
            const revisionNames = new Set(revisionColumns.map((column) => column.name));
            if (!revisionNames.has('visibility')) {
                statements.push(`ALTER TABLE post_revisions ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'`);
            }
            if (!revisionNames.has('custom_excerpt')) {
                statements.push('ALTER TABLE post_revisions ADD COLUMN custom_excerpt TEXT');
            }
            if (!revisionNames.has('feature_image')) {
                statements.push('ALTER TABLE post_revisions ADD COLUMN feature_image TEXT');
            }
            if (!revisionNames.has('feature_image_alt')) {
                statements.push('ALTER TABLE post_revisions ADD COLUMN feature_image_alt TEXT');
            }
            if (!revisionNames.has('feature_image_caption')) {
                statements.push('ALTER TABLE post_revisions ADD COLUMN feature_image_caption TEXT');
            }
        }
        for (const statement of statements) {
            await db.run(sql.raw(statement));
        }
        schemaEnsured = true;
    };
    const createPost = async (post: NewPostRecord) => {
        await ensureSchema();
        await db.insert(postTable).values(post);
        const rows = await db.select().from(postTable).where(eq(postTable.id, post.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Post missing after insert');
        }
        return rows[0];
    };

    const getPostById = async (id: string) => {
        await ensureSchema();
        const rows = await db.select().from(postTable).where(eq(postTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const getPostBySlug = async (slug: string) => {
        await ensureSchema();
        const rows = await db.select().from(postTable).where(eq(postTable.slug, slug)).limit(1);
        return rows[0] ?? null;
    };

    const updatePost = async (post: PostRecord) => {
        await ensureSchema();
        await db
            .update(postTable)
            .set({
                title: post.title,
                slug: post.slug,
                status: post.status,
                lexical: post.lexical,
                visibility: post.visibility,
                customExcerpt: post.customExcerpt,
                featureImage: post.featureImage,
                featureImageAlt: post.featureImageAlt,
                featureImageCaption: post.featureImageCaption,
                publishedAt: post.publishedAt,
                updatedAt: post.updatedAt
            })
            .where(eq(postTable.id, post.id));
        const rows = await db.select().from(postTable).where(eq(postTable.id, post.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Post missing after update');
        }
        return rows[0];
    };

    const listPublishedPosts = async ({limit, offset}: {limit: number; offset: number}) => {
        await ensureSchema();
        return db
            .select()
            .from(postTable)
            .where(eq(postTable.status, 'published'))
            .orderBy(desc(postTable.publishedAt))
            .limit(limit)
            .offset(offset);
    };

    const countPublishedPosts = async () => {
        await ensureSchema();
        const rows = await db
            .select({value: count()})
            .from(postTable)
            .where(eq(postTable.status, 'published'))
            .limit(1);
        return rows[0]?.value ?? 0;
    };

    const deletePost = async (id: string) => {
        await ensureSchema();
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
        deletePost,
        createRevision,
        createContentEvent,
        createContentUrlEvent,
        createContentRedirect,
        createTag,
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
