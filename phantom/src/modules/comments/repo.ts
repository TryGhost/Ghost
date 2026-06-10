import {and, desc, eq, gt, isNull, lt} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {commentTable, type CommentRecord, type NewCommentRecord} from './db.js';

export type CommentRepository = {
    createComment: (comment: NewCommentRecord) => Promise<CommentRecord>;
    updateComment: (comment: CommentRecord) => Promise<CommentRecord>;
    getCommentById: (id: string) => Promise<CommentRecord | null>;
    deleteComment: (id: string) => Promise<void>;
    listComments: (input: {
        postId: string;
        parentId?: string;
        sort: 'newest' | 'oldest';
        limit: number;
        cursor?: number;
    }) => Promise<CommentRecord[]>;
};

export const createCommentRepository = (db: DbClient): CommentRepository => {
    const createComment = async (comment: NewCommentRecord) => {
        await db.insert(commentTable).values(comment);
        const rows = await db.select().from(commentTable).where(eq(commentTable.id, comment.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Comment missing after insert');
        }
        return rows[0];
    };

    const updateComment = async (comment: CommentRecord) => {
        await db
            .update(commentTable)
            .set({
                body: comment.body,
                status: comment.status,
                updatedAt: comment.updatedAt
            })
            .where(eq(commentTable.id, comment.id));
        const rows = await db.select().from(commentTable).where(eq(commentTable.id, comment.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Comment missing after update');
        }
        return rows[0];
    };

    const getCommentById = async (id: string) => {
        const rows = await db.select().from(commentTable).where(eq(commentTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const deleteComment = async (id: string) => {
        await db.delete(commentTable).where(eq(commentTable.id, id));
    };

    const listComments = async ({postId, parentId, sort, limit, cursor}: {
        postId: string;
        parentId?: string;
        sort: 'newest' | 'oldest';
        limit: number;
        cursor?: number;
    }) => {
        const order = sort === 'newest' ? desc(commentTable.createdAt) : commentTable.createdAt;
        const baseFilter = parentId
            ? and(eq(commentTable.postId, postId), eq(commentTable.parentId, parentId))
            : and(eq(commentTable.postId, postId), isNull(commentTable.parentId));

        const cursorFilter = cursor
            ? sort === 'newest'
                ? lt(commentTable.createdAt, cursor)
                : gt(commentTable.createdAt, cursor)
            : undefined;

        const filter = cursorFilter ? and(baseFilter, cursorFilter) : baseFilter;
        return db.select().from(commentTable).where(filter).orderBy(order).limit(limit);
    };

    return {
        createComment,
        updateComment,
        getCommentById,
        deleteComment,
        listComments
    };
};
