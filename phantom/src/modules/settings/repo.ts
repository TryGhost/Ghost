import {eq, inArray, sql} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    customObjectRecordTable,
    customObjectTable,
    metafieldMigrationTable,
    metafieldTable,
    settingsMigrationTable,
    settingTable,
    settingsEventTable,
    type CustomObjectEntryRecord,
    type CustomObjectRecord,
    type MetafieldMigrationRecord,
    type MetafieldRecord,
    type NewCustomObjectEntryRecord,
    type NewCustomObjectRecord,
    type NewMetafieldMigrationRecord,
    type NewMetafieldRecord,
    type NewSettingsMigrationRecord,
    type NewSettingRecord,
    type NewSettingsEventRecord,
    type SettingsMigrationRecord,
    type SettingRecord
} from './db.js';

export type SettingsRepository = {
    listSettings: () => Promise<SettingRecord[]>;
    getSettingByKey: (key: string) => Promise<SettingRecord | null>;
    upsertSetting: (setting: NewSettingRecord) => Promise<SettingRecord>;
    createSettingsEvent: (event: NewSettingsEventRecord) => Promise<void>;
    createMetafields: (metafields: NewMetafieldRecord[]) => Promise<void>;
    deleteMetafieldsByKeys: (ids: string[]) => Promise<void>;
    getMetafieldMigrationByVersion: (version: string) => Promise<MetafieldMigrationRecord | null>;
    createMetafieldMigration: (migration: NewMetafieldMigrationRecord) => Promise<MetafieldMigrationRecord>;
    markMetafieldMigrationRolledBack: (id: string, rolledBackAt: number) => Promise<void>;
    getSettingsMigrationByGroup: (group: string) => Promise<SettingsMigrationRecord | null>;
    createSettingsMigration: (migration: NewSettingsMigrationRecord) => Promise<SettingsMigrationRecord>;
    listCustomObjects: () => Promise<CustomObjectRecord[]>;
    getCustomObjectById: (id: string) => Promise<CustomObjectRecord | null>;
    getCustomObjectBySlug: (slug: string) => Promise<CustomObjectRecord | null>;
    createCustomObject: (object: NewCustomObjectRecord) => Promise<CustomObjectRecord>;
    updateCustomObject: (object: CustomObjectRecord) => Promise<CustomObjectRecord>;
    deleteCustomObject: (id: string) => Promise<void>;
    listCustomObjectRecords: (objectId: string) => Promise<CustomObjectEntryRecord[]>;
    getCustomObjectRecordById: (id: string) => Promise<CustomObjectEntryRecord | null>;
    createCustomObjectRecord: (record: NewCustomObjectEntryRecord) => Promise<CustomObjectEntryRecord>;
    updateCustomObjectRecord: (record: CustomObjectEntryRecord) => Promise<CustomObjectEntryRecord>;
    deleteCustomObjectRecord: (id: string) => Promise<void>;
};

export const createSettingsRepository = (db: DbClient): SettingsRepository => {
    let schemaEnsured = false;

    const ensureSchema = async () => {
        if (schemaEnsured) {
            return;
        }
        const statements = [
            `CREATE TABLE IF NOT EXISTS settings (
                id TEXT PRIMARY KEY,
                key TEXT NOT NULL,
                "group" TEXT NOT NULL,
                type TEXT NOT NULL,
                value TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS settings_events (
                id TEXT PRIMARY KEY,
                key TEXT NOT NULL,
                "group" TEXT NOT NULL,
                action TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS metafields (
                id TEXT PRIMARY KEY,
                key TEXT NOT NULL,
                "group" TEXT NOT NULL,
                type TEXT NOT NULL,
                value TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS metafield_migrations (
                id TEXT PRIMARY KEY,
                version TEXT NOT NULL,
                direction TEXT NOT NULL,
                keys TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                rolled_back_at INTEGER
            )`,
            `CREATE TABLE IF NOT EXISTS settings_migrations (
                id TEXT PRIMARY KEY,
                "group" TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS custom_objects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT NOT NULL,
                fields TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )`,
            `CREATE TABLE IF NOT EXISTS custom_object_records (
                id TEXT PRIMARY KEY,
                object_id TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )`
        ];

        for (const statement of statements) {
            await db.run(sql.raw(statement));
        }
        schemaEnsured = true;
    };

    const listSettings = async () => {
        await ensureSchema();
        return db.select().from(settingTable);
    };

    const getSettingByKey = async (key: string) => {
        await ensureSchema();
        const rows = await db.select().from(settingTable).where(eq(settingTable.key, key)).limit(1);
        return rows[0] ?? null;
    };

    const upsertSetting = async (setting: NewSettingRecord) => {
        await ensureSchema();
        await db
            .insert(settingTable)
            .values(setting)
            .onConflictDoUpdate({
                target: settingTable.id,
                set: {
                    value: setting.value,
                    type: setting.type,
                    group: setting.group,
                    updatedAt: setting.updatedAt
                }
            });

        const rows = await db.select().from(settingTable).where(eq(settingTable.id, setting.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Setting missing after upsert');
        }
        return rows[0];
    };

    const createSettingsEvent = async (event: NewSettingsEventRecord) => {
        await ensureSchema();
        await db.insert(settingsEventTable).values(event);
    };

    const createMetafields = async (metafields: NewMetafieldRecord[]) => {
        await ensureSchema();
        if (metafields.length === 0) {
            return;
        }
        await db.insert(metafieldTable).values(metafields);
    };

    const deleteMetafieldsByKeys = async (ids: string[]) => {
        await ensureSchema();
        if (ids.length === 0) {
            return;
        }
        await db.delete(metafieldTable).where(inArray(metafieldTable.id, ids));
    };

    const getMetafieldMigrationByVersion = async (version: string) => {
        await ensureSchema();
        const rows = await db
            .select()
            .from(metafieldMigrationTable)
            .where(eq(metafieldMigrationTable.version, version))
            .limit(1);
        return rows[0] ?? null;
    };

    const createMetafieldMigration = async (migration: NewMetafieldMigrationRecord) => {
        await ensureSchema();
        await db.insert(metafieldMigrationTable).values(migration);
        const rows = await db
            .select()
            .from(metafieldMigrationTable)
            .where(eq(metafieldMigrationTable.id, migration.id))
            .limit(1);
        if (!rows[0]) {
            throw new Error('Metafield migration missing after insert');
        }
        return rows[0];
    };

    const markMetafieldMigrationRolledBack = async (id: string, rolledBackAt: number) => {
        await ensureSchema();
        await db
            .update(metafieldMigrationTable)
            .set({rolledBackAt})
            .where(eq(metafieldMigrationTable.id, id));
    };

    const getSettingsMigrationByGroup = async (group: string) => {
        await ensureSchema();
        const rows = await db
            .select()
            .from(settingsMigrationTable)
            .where(eq(settingsMigrationTable.group, group))
            .limit(1);
        return rows[0] ?? null;
    };

    const createSettingsMigration = async (migration: NewSettingsMigrationRecord) => {
        await ensureSchema();
        await db.insert(settingsMigrationTable).values(migration);
        const rows = await db
            .select()
            .from(settingsMigrationTable)
            .where(eq(settingsMigrationTable.id, migration.id))
            .limit(1);
        if (!rows[0]) {
            throw new Error('Settings migration missing after insert');
        }
        return rows[0];
    };

    const listCustomObjects = async () => {
        await ensureSchema();
        return db.select().from(customObjectTable);
    };

    const getCustomObjectById = async (id: string) => {
        await ensureSchema();
        const rows = await db.select().from(customObjectTable).where(eq(customObjectTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const getCustomObjectBySlug = async (slug: string) => {
        await ensureSchema();
        const rows = await db.select().from(customObjectTable).where(eq(customObjectTable.slug, slug)).limit(1);
        return rows[0] ?? null;
    };

    const createCustomObject = async (object: NewCustomObjectRecord) => {
        await ensureSchema();
        await db.insert(customObjectTable).values(object);
        const rows = await db.select().from(customObjectTable).where(eq(customObjectTable.id, object.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Custom object missing after insert');
        }
        return rows[0];
    };

    const updateCustomObject = async (object: CustomObjectRecord) => {
        await ensureSchema();
        await db
            .update(customObjectTable)
            .set({
                name: object.name,
                slug: object.slug,
                fields: object.fields,
                updatedAt: object.updatedAt
            })
            .where(eq(customObjectTable.id, object.id));
        const rows = await db.select().from(customObjectTable).where(eq(customObjectTable.id, object.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Custom object missing after update');
        }
        return rows[0];
    };

    const deleteCustomObject = async (id: string) => {
        await ensureSchema();
        await db.delete(customObjectTable).where(eq(customObjectTable.id, id));
        await db.delete(customObjectRecordTable).where(eq(customObjectRecordTable.objectId, id));
    };

    const listCustomObjectRecords = async (objectId: string) => {
        await ensureSchema();
        return db.select().from(customObjectRecordTable).where(eq(customObjectRecordTable.objectId, objectId));
    };

    const getCustomObjectRecordById = async (id: string) => {
        await ensureSchema();
        const rows = await db
            .select()
            .from(customObjectRecordTable)
            .where(eq(customObjectRecordTable.id, id))
            .limit(1);
        return rows[0] ?? null;
    };

    const createCustomObjectRecord = async (record: NewCustomObjectEntryRecord) => {
        await ensureSchema();
        await db.insert(customObjectRecordTable).values(record);
        const rows = await db
            .select()
            .from(customObjectRecordTable)
            .where(eq(customObjectRecordTable.id, record.id))
            .limit(1);
        if (!rows[0]) {
            throw new Error('Custom object record missing after insert');
        }
        return rows[0];
    };

    const updateCustomObjectRecord = async (record: CustomObjectEntryRecord) => {
        await ensureSchema();
        await db
            .update(customObjectRecordTable)
            .set({
                data: record.data,
                updatedAt: record.updatedAt
            })
            .where(eq(customObjectRecordTable.id, record.id));
        const rows = await db
            .select()
            .from(customObjectRecordTable)
            .where(eq(customObjectRecordTable.id, record.id))
            .limit(1);
        if (!rows[0]) {
            throw new Error('Custom object record missing after update');
        }
        return rows[0];
    };

    const deleteCustomObjectRecord = async (id: string) => {
        await ensureSchema();
        await db.delete(customObjectRecordTable).where(eq(customObjectRecordTable.id, id));
    };

    return {
        listSettings,
        getSettingByKey,
        upsertSetting,
        createSettingsEvent,
        createMetafields,
        deleteMetafieldsByKeys,
        getMetafieldMigrationByVersion,
        createMetafieldMigration,
        markMetafieldMigrationRolledBack,
        getSettingsMigrationByGroup,
        createSettingsMigration,
        listCustomObjects,
        getCustomObjectById,
        getCustomObjectBySlug,
        createCustomObject,
        updateCustomObject,
        deleteCustomObject,
        listCustomObjectRecords,
        getCustomObjectRecordById,
        createCustomObjectRecord,
        updateCustomObjectRecord,
        deleteCustomObjectRecord
    };
};
