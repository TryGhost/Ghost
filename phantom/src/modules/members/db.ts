import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const memberTable = sqliteTable('members', {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const memberAuthTokenTable = sqliteTable('member_auth_tokens', {
    id: text('id').primaryKey(),
    memberId: text('member_id'),
    email: text('email').notNull(),
    token: text('token').notNull(),
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
    createdAt: integer('created_at').notNull()
});

export type MemberRecord = typeof memberTable.$inferSelect;
export type NewMemberRecord = typeof memberTable.$inferInsert;
export type MemberAuthTokenRecord = typeof memberAuthTokenTable.$inferSelect;
export type NewMemberAuthTokenRecord = typeof memberAuthTokenTable.$inferInsert;
export type MemberSessionRecord = typeof memberSessionTable.$inferSelect;
export type NewMemberSessionRecord = typeof memberSessionTable.$inferInsert;
export type MemberAuthEventRecord = typeof memberAuthEventTable.$inferSelect;
export type NewMemberAuthEventRecord = typeof memberAuthEventTable.$inferInsert;
