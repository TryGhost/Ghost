import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const partnerOrgTable = sqliteTable('partner_orgs', {
    id: text('id').primaryKey(),
    name: text('name').notNull()
});

export const accessGrantTable = sqliteTable('partner_access_grants', {
    id: text('id').primaryKey(),
    orgId: text('org_id').notNull(),
    scopes: text('scopes').notNull(),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    revokedAt: integer('revoked_at')
});

export const partnerTokenTable = sqliteTable('partner_tokens', {
    id: text('id').primaryKey(),
    grantId: text('grant_id').notNull(),
    subject: text('subject').notNull(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    token: text('token').notNull(),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    revokedAt: integer('revoked_at')
});

export type PartnerOrgRecord = typeof partnerOrgTable.$inferSelect;
export type NewPartnerOrgRecord = typeof partnerOrgTable.$inferInsert;
export type AccessGrantRecord = typeof accessGrantTable.$inferSelect;
export type NewAccessGrantRecord = typeof accessGrantTable.$inferInsert;
export type PartnerTokenRecord = typeof partnerTokenTable.$inferSelect;
export type NewPartnerTokenRecord = typeof partnerTokenTable.$inferInsert;
