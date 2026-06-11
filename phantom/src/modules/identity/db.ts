import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const staffTable = sqliteTable('staff_accounts', {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull(),
    passwordHash: text('password_hash').notNull(),
    twoFactorEnabled: integer('two_factor_enabled').notNull(),
    // Ghost-admin UI state (custom views, night shift, ...) as a JSON blob,
    // mirroring Ghost's users.accessibility column.
    accessibility: text('accessibility'),
    externalSubjectId: text('external_subject_id'),
    externallyManaged: integer('externally_managed').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const roleTable = sqliteTable('roles', {
    id: text('id').primaryKey(),
    name: text('name').notNull()
});

export const staffRoleTable = sqliteTable('staff_roles', {
    staffId: text('staff_id').notNull(),
    roleId: text('role_id').notNull()
});

export const staffSessionTable = sqliteTable('staff_sessions', {
    id: text('id').primaryKey(),
    staffId: text('staff_id').notNull(),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    revokedAt: integer('revoked_at')
});

export const staffInviteTable = sqliteTable('staff_invites', {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    role: text('role').notNull(),
    token: text('token').notNull(),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    acceptedAt: integer('accepted_at')
});

export const staffApiTokenTable = sqliteTable('staff_api_tokens', {
    id: text('id').primaryKey(),
    staffId: text('staff_id').notNull(),
    name: text('name').notNull(),
    token: text('token').notNull(),
    createdAt: integer('created_at').notNull(),
    revokedAt: integer('revoked_at')
});

export const integrationTokenTable = sqliteTable('integration_tokens', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    token: text('token').notNull(),
    createdAt: integer('created_at').notNull(),
    revokedAt: integer('revoked_at')
});

export const staffAuthEventTable = sqliteTable('staff_auth_events', {
    id: text('id').primaryKey(),
    staffId: text('staff_id').notNull(),
    action: text('action').notNull(),
    outcome: text('outcome').notNull(),
    ipAddress: text('ip_address'),
    deviceId: text('device_id'),
    createdAt: integer('created_at').notNull()
});

export const staffAuthFactorTable = sqliteTable('staff_auth_factors', {
    id: text('id').primaryKey(),
    staffId: text('staff_id').notNull(),
    type: text('type').notNull(),
    token: text('token').notNull(),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
    invalidatedAt: integer('invalidated_at')
});

export const resetTokenTable = sqliteTable('staff_reset_tokens', {
    id: text('id').primaryKey(),
    staffId: text('staff_id').notNull(),
    token: text('token').notNull(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at')
});

export type StaffRecord = typeof staffTable.$inferSelect;
export type NewStaffRecord = typeof staffTable.$inferInsert;
export type RoleRecord = typeof roleTable.$inferSelect;
export type NewRoleRecord = typeof roleTable.$inferInsert;
export type StaffSessionRecord = typeof staffSessionTable.$inferSelect;
export type NewStaffSessionRecord = typeof staffSessionTable.$inferInsert;
export type StaffRoleRecord = typeof staffRoleTable.$inferSelect;
export type NewStaffRoleRecord = typeof staffRoleTable.$inferInsert;
export type StaffInviteRecord = typeof staffInviteTable.$inferSelect;
export type NewStaffInviteRecord = typeof staffInviteTable.$inferInsert;
export type StaffApiTokenRecord = typeof staffApiTokenTable.$inferSelect;
export type NewStaffApiTokenRecord = typeof staffApiTokenTable.$inferInsert;
export type IntegrationTokenRecord = typeof integrationTokenTable.$inferSelect;
export type NewIntegrationTokenRecord = typeof integrationTokenTable.$inferInsert;
export type StaffAuthEventRecord = typeof staffAuthEventTable.$inferSelect;
export type NewStaffAuthEventRecord = typeof staffAuthEventTable.$inferInsert;
export type StaffAuthFactorRecord = typeof staffAuthFactorTable.$inferSelect;
export type NewStaffAuthFactorRecord = typeof staffAuthFactorTable.$inferInsert;
export type ResetTokenRecord = typeof resetTokenTable.$inferSelect;
export type NewResetTokenRecord = typeof resetTokenTable.$inferInsert;
