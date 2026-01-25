import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const postTable = sqliteTable('posts', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    publishedAt: integer('published_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const postRevisionTable = sqliteTable('post_revisions', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull()
});

export const tagTable = sqliteTable('tags', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull()
});

export const postTagTable = sqliteTable('posts_tags', {
    postId: text('post_id').notNull(),
    tagId: text('tag_id').notNull()
});

export type PostRecord = typeof postTable.$inferSelect;
export type NewPostRecord = typeof postTable.$inferInsert;
export type PostRevisionRecord = typeof postRevisionTable.$inferSelect;
export type NewPostRevisionRecord = typeof postRevisionTable.$inferInsert;
export type TagRecord = typeof tagTable.$inferSelect;
export type NewTagRecord = typeof tagTable.$inferInsert;
