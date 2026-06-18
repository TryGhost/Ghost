import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const exportJobTable = sqliteTable('export_jobs', {
    id: text('id').primaryKey(),
    status: text('status').notNull(),
    tables: text('tables').notNull(),
    createdAt: integer('created_at').notNull()
});

export const importJobTable = sqliteTable('import_jobs', {
    id: text('id').primaryKey(),
    format: text('format').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull()
});

export const migrationRunTable = sqliteTable('migration_runs', {
    id: text('id').primaryKey(),
    version: text('version').notNull(),
    action: text('action').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull()
});

export const fixtureRunTable = sqliteTable('fixture_runs', {
    id: text('id').primaryKey(),
    status: text('status').notNull(),
    createdAt: integer('created_at').notNull()
});

export const nullableMigrationTable = sqliteTable('nullable_migrations', {
    id: text('id').primaryKey(),
    tableName: text('table_name').notNull(),
    columnName: text('column_name').notNull(),
    nullable: integer('nullable').notNull(),
    disableForeignKeys: integer('disable_foreign_keys').notNull(),
    preserveDefaults: integer('preserve_defaults').notNull(),
    createdAt: integer('created_at').notNull()
});

export const updateCheckTable = sqliteTable('update_checks', {
    id: text('id').primaryKey(),
    status: text('status').notNull(),
    checkedAt: integer('checked_at').notNull()
});

export const tokenCleanupTable = sqliteTable('token_cleanups', {
    id: text('id').primaryKey(),
    removedCount: integer('removed_count').notNull(),
    createdAt: integer('created_at').notNull()
});

export const metricsConfigTable = sqliteTable('metrics_config', {
    id: text('id').primaryKey(),
    enabled: integer('enabled').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export type ExportJobRecord = typeof exportJobTable.$inferSelect;
export type NewExportJobRecord = typeof exportJobTable.$inferInsert;
export type ImportJobRecord = typeof importJobTable.$inferSelect;
export type NewImportJobRecord = typeof importJobTable.$inferInsert;
export type MigrationRunRecord = typeof migrationRunTable.$inferSelect;
export type NewMigrationRunRecord = typeof migrationRunTable.$inferInsert;
export type FixtureRunRecord = typeof fixtureRunTable.$inferSelect;
export type NewFixtureRunRecord = typeof fixtureRunTable.$inferInsert;
export type NullableMigrationRecord = typeof nullableMigrationTable.$inferSelect;
export type NewNullableMigrationRecord = typeof nullableMigrationTable.$inferInsert;
export type UpdateCheckRecord = typeof updateCheckTable.$inferSelect;
export type NewUpdateCheckRecord = typeof updateCheckTable.$inferInsert;
export type TokenCleanupRecord = typeof tokenCleanupTable.$inferSelect;
export type NewTokenCleanupRecord = typeof tokenCleanupTable.$inferInsert;
export type MetricsConfigRecord = typeof metricsConfigTable.$inferSelect;
export type NewMetricsConfigRecord = typeof metricsConfigTable.$inferInsert;
