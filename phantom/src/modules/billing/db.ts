import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const billingProfileTable = sqliteTable('billing_profiles', {
    id: text('id').primaryKey(),
    siteId: text('site_id').notNull(),
    status: text('status').notNull(),
    linkedAt: integer('linked_at').notNull(),
    unlinkedAt: integer('unlinked_at')
});

export const marketplaceEntitlementTable = sqliteTable('marketplace_entitlements', {
    id: text('id').primaryKey(),
    listingId: text('listing_id').notNull(),
    expiresAt: integer('expires_at').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull()
});

export type BillingProfileRecord = typeof billingProfileTable.$inferSelect;
export type NewBillingProfileRecord = typeof billingProfileTable.$inferInsert;
export type MarketplaceEntitlementRecord = typeof marketplaceEntitlementTable.$inferSelect;
export type NewMarketplaceEntitlementRecord = typeof marketplaceEntitlementTable.$inferInsert;
