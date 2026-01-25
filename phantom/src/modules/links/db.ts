import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const linkTable = sqliteTable('links', {
    id: text('id').primaryKey(),
    url: text('url').notNull(),
    postId: text('post_id'),
    createdAt: integer('created_at').notNull()
});

export const linkRedirectTable = sqliteTable('link_redirects', {
    id: text('id').primaryKey(),
    linkId: text('link_id').notNull(),
    redirectTo: text('redirect_to').notNull(),
    createdAt: integer('created_at').notNull()
});

export const linkClickTable = sqliteTable('link_clicks', {
    id: text('id').primaryKey(),
    linkId: text('link_id').notNull(),
    requestId: text('request_id').notNull(),
    createdAt: integer('created_at').notNull()
});

export type LinkRecord = typeof linkTable.$inferSelect;
export type NewLinkRecord = typeof linkTable.$inferInsert;
export type LinkRedirectRecord = typeof linkRedirectTable.$inferSelect;
export type NewLinkRedirectRecord = typeof linkRedirectTable.$inferInsert;
export type LinkClickRecord = typeof linkClickTable.$inferSelect;
export type NewLinkClickRecord = typeof linkClickTable.$inferInsert;
