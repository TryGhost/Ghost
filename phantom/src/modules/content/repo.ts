import {eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    postRevisionTable,
    postTable,
    postTagTable,
    tagTable,
    type NewPostRecord,
    type NewPostRevisionRecord,
    type NewTagRecord,
    type PostRecord,
    type PostRevisionRecord,
    type TagRecord
} from './db.js';

export type ContentRepository = {
    createPost: (post: NewPostRecord) => Promise<PostRecord>;
    getPostById: (id: string) => Promise<PostRecord | null>;
    createRevision: (revision: NewPostRevisionRecord) => Promise<PostRevisionRecord>;
    createTag: (tag: NewTagRecord) => Promise<TagRecord>;
    getTagBySlug: (slug: string) => Promise<TagRecord | null>;
    linkTagToPost: (postId: string, tagId: string) => Promise<void>;
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

    const createRevision = async (revision: NewPostRevisionRecord) => {
        await db.insert(postRevisionTable).values(revision);
        const rows = await db.select().from(postRevisionTable).where(eq(postRevisionTable.id, revision.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Revision missing after insert');
        }
        return rows[0];
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

    return {
        createPost,
        getPostById,
        createRevision,
        createTag,
        getTagBySlug,
        linkTagToPost
    };
};
