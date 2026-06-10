import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

export const settingTable = sqliteTable('settings', {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    group: text('group').notNull(),
    type: text('type').notNull(),
    value: text('value').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const settingsEventTable = sqliteTable('settings_events', {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    group: text('group').notNull(),
    action: text('action').notNull(),
    payload: text('payload').notNull(),
    createdAt: integer('created_at').notNull()
});

export const metafieldTable = sqliteTable('metafields', {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    group: text('group').notNull(),
    type: text('type').notNull(),
    value: text('value').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const metafieldMigrationTable = sqliteTable('metafield_migrations', {
    id: text('id').primaryKey(),
    version: text('version').notNull(),
    direction: text('direction').notNull(),
    keys: text('keys').notNull(),
    createdAt: integer('created_at').notNull(),
    rolledBackAt: integer('rolled_back_at')
});

export const settingsMigrationTable = sqliteTable('settings_migrations', {
    id: text('id').primaryKey(),
    group: text('group').notNull(),
    createdAt: integer('created_at').notNull()
});

export const customObjectTable = sqliteTable('custom_objects', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    fields: text('fields').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export const customObjectRecordTable = sqliteTable('custom_object_records', {
    id: text('id').primaryKey(),
    objectId: text('object_id').notNull(),
    data: text('data').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
});

export type SettingRecord = typeof settingTable.$inferSelect;
export type NewSettingRecord = typeof settingTable.$inferInsert;
export type SettingsEventRecord = typeof settingsEventTable.$inferSelect;
export type NewSettingsEventRecord = typeof settingsEventTable.$inferInsert;
export type MetafieldRecord = typeof metafieldTable.$inferSelect;
export type NewMetafieldRecord = typeof metafieldTable.$inferInsert;
export type MetafieldMigrationRecord = typeof metafieldMigrationTable.$inferSelect;
export type NewMetafieldMigrationRecord = typeof metafieldMigrationTable.$inferInsert;
export type SettingsMigrationRecord = typeof settingsMigrationTable.$inferSelect;
export type NewSettingsMigrationRecord = typeof settingsMigrationTable.$inferInsert;
export type CustomObjectRecord = typeof customObjectTable.$inferSelect;
export type NewCustomObjectRecord = typeof customObjectTable.$inferInsert;
export type CustomObjectEntryRecord = typeof customObjectRecordTable.$inferSelect;
export type NewCustomObjectEntryRecord = typeof customObjectRecordTable.$inferInsert;
