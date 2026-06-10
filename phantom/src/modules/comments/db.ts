import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const commentTable = sqliteTable('comments', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull(),
    memberId: text('member_id').notNull(),
    authorName: text('author_name').notNull(),
    body: text('body').notNull(),
    status: text('status').notNull(),
    parentId: text('parent_id'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export type CommentRecord = typeof commentTable.$inferSelect;
export type NewCommentRecord = typeof commentTable.$inferInsert;
