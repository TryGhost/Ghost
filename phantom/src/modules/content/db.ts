import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const postTable = sqliteTable('posts', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    status: text('status').notNull(),
    lexical: text('lexical').notNull(),
    visibility: text('visibility').notNull().default('public'),
    customExcerpt: text('custom_excerpt'),
    featureImage: text('feature_image'),
    featureImageAlt: text('feature_image_alt'),
    featureImageCaption: text('feature_image_caption'),
    publishedAt: integer('published_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const postRevisionTable = sqliteTable('post_revisions', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    status: text('status').notNull(),
    lexical: text('lexical').notNull(),
    visibility: text('visibility').notNull().default('public'),
    customExcerpt: text('custom_excerpt'),
    featureImage: text('feature_image'),
    featureImageAlt: text('feature_image_alt'),
    featureImageCaption: text('feature_image_caption'),
    editorId: text('editor_id'),
    reason: text('reason'),
    createdAt: integer('created_at').notNull()
});

export const contentEventTable = sqliteTable('content_events', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull(),
    type: text('type').notNull(),
    payload: text('payload').notNull(),
    createdAt: integer('created_at').notNull()
});

export const contentUrlEventTable = sqliteTable('content_url_events', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull(),
    action: text('action').notNull(),
    url: text('url').notNull(),
    createdAt: integer('created_at').notNull()
});

export const contentRedirectTable = sqliteTable('content_redirects', {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull(),
    fromUrl: text('from_url').notNull(),
    toUrl: text('to_url').notNull(),
    createdAt: integer('created_at').notNull()
});

export const tagTable = sqliteTable('tags', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull()
});

export const collectionTable = sqliteTable('collections', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    filter: text('filter').notNull()
});

export const authorProfileTable = sqliteTable('author_profiles', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    bio: text('bio')
});

export const postTagTable = sqliteTable('posts_tags', {
    postId: text('post_id').notNull(),
    tagId: text('tag_id').notNull()
});

export type PostRecord = typeof postTable.$inferSelect;
export type NewPostRecord = typeof postTable.$inferInsert;
export type PostRevisionRecord = typeof postRevisionTable.$inferSelect;
export type NewPostRevisionRecord = typeof postRevisionTable.$inferInsert;
export type ContentEventRecord = typeof contentEventTable.$inferSelect;
export type NewContentEventRecord = typeof contentEventTable.$inferInsert;
export type ContentUrlEventRecord = typeof contentUrlEventTable.$inferSelect;
export type NewContentUrlEventRecord = typeof contentUrlEventTable.$inferInsert;
export type ContentRedirectRecord = typeof contentRedirectTable.$inferSelect;
export type NewContentRedirectRecord = typeof contentRedirectTable.$inferInsert;
export type TagRecord = typeof tagTable.$inferSelect;
export type NewTagRecord = typeof tagTable.$inferInsert;
export type CollectionRecord = typeof collectionTable.$inferSelect;
export type NewCollectionRecord = typeof collectionTable.$inferInsert;
export type AuthorProfileRecord = typeof authorProfileTable.$inferSelect;
export type NewAuthorProfileRecord = typeof authorProfileTable.$inferInsert;
