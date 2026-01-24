import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const siteTable = sqliteTable('sites', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    locale: text('locale').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export type SiteRecord = typeof siteTable.$inferSelect;
export type NewSiteRecord = typeof siteTable.$inferInsert;
