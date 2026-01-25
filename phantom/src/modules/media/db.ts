import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const mediaAssetTable = sqliteTable('media_assets', {
    id: text('id').primaryKey(),
    url: text('url').notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull(),
    createdAt: integer('created_at').notNull()
});

export const storageConfigTable = sqliteTable('storage_configs', {
    id: text('id').primaryKey(),
    adapter: text('adapter').notNull(),
    baseUrl: text('base_url')
});

export type MediaAssetRecord = typeof mediaAssetTable.$inferSelect;
export type NewMediaAssetRecord = typeof mediaAssetTable.$inferInsert;
export type StorageConfigRecord = typeof storageConfigTable.$inferSelect;
export type NewStorageConfigRecord = typeof storageConfigTable.$inferInsert;
