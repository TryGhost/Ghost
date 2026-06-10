import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const extensionListingTable = sqliteTable('extension_listings', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    paid: integer('paid').notNull(),
    version: text('version').notNull(),
    capabilities: text('capabilities').notNull(),
    createdAt: integer('created_at').notNull()
});

export const extensionInstallTable = sqliteTable('extension_installs', {
    id: text('id').primaryKey(),
    listingId: text('listing_id').notNull(),
    status: text('status').notNull(),
    config: text('config').notNull(),
    createdAt: integer('created_at').notNull()
});

export type ExtensionListingRecord = typeof extensionListingTable.$inferSelect;
export type NewExtensionListingRecord = typeof extensionListingTable.$inferInsert;
export type ExtensionInstallRecord = typeof extensionInstallTable.$inferSelect;
export type NewExtensionInstallRecord = typeof extensionInstallTable.$inferInsert;
