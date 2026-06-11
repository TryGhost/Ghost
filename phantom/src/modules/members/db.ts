import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const memberTable = sqliteTable('members', {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    status: text('status').notNull(),
    name: text('name'),
    note: text('note'),
    geolocation: text('geolocation'),
    lastSeenAt: integer('last_seen_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const memberLabelTable = sqliteTable('member_labels', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const memberLabelLinkTable = sqliteTable('member_label_links', {
    memberId: text('member_id').notNull(),
    labelId: text('label_id').notNull()
});

export const memberAuthTokenTable = sqliteTable('member_auth_tokens', {
    id: text('id').primaryKey(),
    memberId: text('member_id'),
    email: text('email').notNull(),
    token: text('token').notNull(),
    source: text('source'),
    medium: text('medium'),
    campaign: text('campaign'),
    referrer: text('referrer'),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at')
});

export const memberSessionTable = sqliteTable('member_sessions', {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    revokedAt: integer('revoked_at')
});

export const memberAuthEventTable = sqliteTable('member_auth_events', {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull(),
    action: text('action').notNull(),
    source: text('source'),
    medium: text('medium'),
    campaign: text('campaign'),
    referrer: text('referrer'),
    createdAt: integer('created_at').notNull()
});

export type MemberRecord = typeof memberTable.$inferSelect;
export type NewMemberRecord = typeof memberTable.$inferInsert;
export type MemberLabelRecord = typeof memberLabelTable.$inferSelect;
export type NewMemberLabelRecord = typeof memberLabelTable.$inferInsert;
export type MemberAuthTokenRecord = typeof memberAuthTokenTable.$inferSelect;
export type NewMemberAuthTokenRecord = typeof memberAuthTokenTable.$inferInsert;
export type MemberSessionRecord = typeof memberSessionTable.$inferSelect;
export type NewMemberSessionRecord = typeof memberSessionTable.$inferInsert;
export type MemberAuthEventRecord = typeof memberAuthEventTable.$inferSelect;
export type NewMemberAuthEventRecord = typeof memberAuthEventTable.$inferInsert;
