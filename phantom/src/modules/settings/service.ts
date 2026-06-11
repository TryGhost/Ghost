import {randomUUID} from 'node:crypto';
import type {
    CustomObjectCreateRequest,
    CustomObjectField,
    CustomObjectRecordRequest,
    CustomObjectResponse,
    CustomObjectUpdateRequest,
    MetafieldMigrationRequest,
    MetafieldMigrationResponse,
    SettingResponse,
    SettingsMigrationRequest,
    SettingsMigrationResponse,
    SettingsListResponse,
    SettingsUpdateRequest,
    SettingsUpdateResponse
} from './contracts.js';
import type {
    CustomObjectEntryRecord,
    CustomObjectRecord,
    SettingRecord
} from './db.js';
import type {SettingsRepository} from './repo.js';
import {HttpError} from '../../platform/http/errors.js';

type SettingType = 'string' | 'number' | 'boolean' | 'json';

type SettingDefinition = {
    key: string;
    group: string;
    type: SettingType;
    defaultValue: string | number | boolean | Record<string, unknown> | unknown[] | null;
    allowNull?: boolean;
};

const settingDefinitions: SettingDefinition[] = [
    {
        key: 'site.title',
        group: 'site',
        type: 'string',
        defaultValue: 'Ghost'
    },
    {
        key: 'site.description',
        group: 'site',
        type: 'string',
        defaultValue: null,
        allowNull: true
    },
    {
        key: 'site.locale',
        group: 'site',
        type: 'string',
        defaultValue: 'en'
    },
    {
        key: 'site.cover_image',
        group: 'site',
        type: 'string',
        defaultValue: null
    },
    {
        key: 'site.logo',
        group: 'site',
        type: 'string',
        defaultValue: null
    },
    {
        key: 'site.icon',
        group: 'site',
        type: 'string',
        defaultValue: null
    },
    {
        key: 'site.accent_color',
        group: 'site',
        type: 'string',
        defaultValue: '#FF1A75'
    },
    {
        key: 'feature.comments',
        group: 'features',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'comments.access',
        group: 'features',
        type: 'string',
        defaultValue: 'all'
    },
    {
        key: 'feature.membership',
        group: 'features',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'theme.brandColor',
        group: 'theme',
        type: 'string',
        defaultValue: '#15171A'
    },
    {
        key: 'theme.active',
        group: 'theme',
        type: 'string',
        defaultValue: 'casper'
    },
    {
        key: 'site.timezone',
        group: 'site',
        type: 'string',
        defaultValue: 'Etc/UTC'
    },
    {
        key: 'site.facebook',
        group: 'site',
        type: 'string',
        defaultValue: null,
        allowNull: true
    },
    {
        key: 'site.twitter',
        group: 'site',
        type: 'string',
        defaultValue: null,
        allowNull: true
    },
    {
        key: 'site.navigation',
        group: 'site',
        type: 'json',
        defaultValue: []
    },
    {
        key: 'site.secondary_navigation',
        group: 'site',
        type: 'json',
        defaultValue: []
    },
    {
        key: 'site.codeinjection_head',
        group: 'site',
        type: 'string',
        defaultValue: null,
        allowNull: true
    },
    {
        key: 'site.codeinjection_foot',
        group: 'site',
        type: 'string',
        defaultValue: null,
        allowNull: true
    },
    {
        // Site access control: private sites funnel through /private/.
        key: 'site.is_private',
        group: 'site',
        type: 'boolean',
        defaultValue: false
    },
    {
        key: 'site.password',
        group: 'site',
        type: 'string',
        defaultValue: '',
        allowNull: true
    },
    {
        // The admin's saved post-list views, shared across staff.
        key: 'site.shared_views',
        group: 'site',
        type: 'json',
        defaultValue: []
    },
    {
        key: 'members.signup_access',
        group: 'members',
        type: 'string',
        defaultValue: 'all'
    },
    {
        key: 'members.track_sources',
        group: 'members',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'members.default_content_visibility',
        group: 'members',
        type: 'string',
        defaultValue: 'public'
    },
    {
        key: 'social_web.enabled',
        group: 'social_web',
        type: 'boolean',
        defaultValue: true
    },
    {
        key: 'labs.flags',
        group: 'labs',
        type: 'json',
        defaultValue: {}
    },
    {
        key: 'announcement.content',
        group: 'announcement',
        type: 'string',
        defaultValue: null,
        allowNull: true
    },
    {
        // Audience segments the bar shows for: visitors/free_members/paid_members.
        key: 'announcement.visibility',
        group: 'announcement',
        type: 'json',
        defaultValue: []
    },
    {
        key: 'announcement.background',
        group: 'announcement',
        type: 'string',
        defaultValue: 'dark'
    }
];

const settingsByKey = new Map(settingDefinitions.map((definition) => [definition.key, definition]));
const coreSettingAllowlist = new Set(settingDefinitions.filter((definition) => definition.group === 'core').map((definition) => definition.key));
// Groups born in the v10 schema baseline — no metafield migration to wait on.
const migratedSettingGroups = new Set(['site', 'features', 'theme', 'members', 'social_web', 'labs', 'announcement']);

const parseSettingValue = (value: string) => JSON.parse(value) as SettingResponse['value'];

const normalizeSetting = (record: SettingRecord): SettingResponse => {
    return {
        key: record.key,
        group: record.group,
        type: record.type as SettingType,
        value: parseSettingValue(record.value),
        updatedAt: record.updatedAt
    };
};

const validateSettingValue = (definition: SettingDefinition, value: SettingResponse['value']) => {
    if (value === null) {
        if (definition.allowNull) {
            return;
        }
        throw new HttpError(422, 'invalid_setting_value', `Setting ${definition.key} cannot be null`);
    }

    switch (definition.type) {
        case 'string':
            if (typeof value !== 'string') {
                throw new HttpError(422, 'invalid_setting_value', `Setting ${definition.key} must be string`);
            }
            return;
        case 'number':
            if (typeof value !== 'number' || Number.isNaN(value)) {
                throw new HttpError(422, 'invalid_setting_value', `Setting ${definition.key} must be number`);
            }
            return;
        case 'boolean':
            if (typeof value !== 'boolean') {
                throw new HttpError(422, 'invalid_setting_value', `Setting ${definition.key} must be boolean`);
            }
            return;
        case 'json':
            if (typeof value !== 'object') {
                throw new HttpError(422, 'invalid_setting_value', `Setting ${definition.key} must be JSON`);
            }
            return;
        default:
            throw new HttpError(422, 'invalid_setting_value', `Unknown type for ${definition.key}`);
    }
};

const requireSettingsMigration = async (repository: SettingsRepository, group: string) => {
    if (group === 'core') {
        return;
    }

    if (migratedSettingGroups.has(group)) {
        return;
    }

    const migration = await repository.getSettingsMigrationByGroup(group);
    if (!migration) {
        throw new HttpError(409, 'settings_migration_required', `Missing settings migration for ${group}`);
    }
};

const parseFields = (record: CustomObjectRecord) => {
    return JSON.parse(record.fields) as CustomObjectField[];
};

const parseRecordData = (record: CustomObjectEntryRecord) => {
    return JSON.parse(record.data) as Record<string, unknown>;
};

const validateCustomObjectFields = (fields: CustomObjectField[]) => {
    const seen = new Set<string>();
    for (const field of fields) {
        if (seen.has(field.name)) {
            throw new HttpError(422, 'custom_object_field_duplicate', `Duplicate field ${field.name}`);
        }
        seen.add(field.name);
    }
};

const validateCustomObjectData = (fields: CustomObjectField[], data: Record<string, unknown>) => {
    const allowed = new Set(fields.map((field) => field.name));

    for (const key of Object.keys(data)) {
        if (!allowed.has(key)) {
            throw new HttpError(422, 'custom_object_unknown_field', `Unknown field ${key}`);
        }
    }

    for (const field of fields) {
        const value = data[field.name];
        const isMissing = value === undefined || value === null;
        if (field.required && isMissing) {
            throw new HttpError(422, 'custom_object_required', `Field ${field.name} is required`);
        }
        if (isMissing) {
            continue;
        }

        switch (field.type) {
            case 'string':
                if (typeof value !== 'string') {
                    throw new HttpError(422, 'custom_object_invalid', `Field ${field.name} must be string`);
                }
                break;
            case 'number':
                if (typeof value !== 'number' || Number.isNaN(value)) {
                    throw new HttpError(422, 'custom_object_invalid', `Field ${field.name} must be number`);
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    throw new HttpError(422, 'custom_object_invalid', `Field ${field.name} must be boolean`);
                }
                break;
            case 'json':
                if (typeof value !== 'object') {
                    throw new HttpError(422, 'custom_object_invalid', `Field ${field.name} must be JSON`);
                }
                break;
            default:
                throw new HttpError(422, 'custom_object_invalid', `Unknown field type for ${field.name}`);
        }
    }
};

const toCustomObjectResponse = (record: CustomObjectRecord): CustomObjectResponse => {
    return {
        id: record.id,
        name: record.name,
        slug: record.slug,
        fields: parseFields(record),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
    };
};

const toCustomObjectRecordResponse = (record: CustomObjectEntryRecord) => {
    return {
        id: record.id,
        objectId: record.objectId,
        data: parseRecordData(record),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
    };
};

export type SettingsService = {
    listSettings: () => Promise<SettingsListResponse>;
    updateSettings: (input: SettingsUpdateRequest) => Promise<SettingsUpdateResponse>;
    migrateSettingsToMetafields: (input: MetafieldMigrationRequest) => Promise<MetafieldMigrationResponse>;
    rollbackMetafieldMigration: (input: MetafieldMigrationRequest) => Promise<MetafieldMigrationResponse>;
    registerSettingsMigration: (input: SettingsMigrationRequest) => Promise<SettingsMigrationResponse>;
    listCustomObjects: () => Promise<{customObjects: CustomObjectResponse[]}>;
    createCustomObject: (input: CustomObjectCreateRequest) => Promise<{customObject: CustomObjectResponse}>;
    updateCustomObject: (id: string, input: CustomObjectUpdateRequest) => Promise<{customObject: CustomObjectResponse}>;
    getCustomObject: (id: string) => Promise<{customObject: CustomObjectResponse}>;
    deleteCustomObject: (id: string) => Promise<void>;
    listCustomObjectRecords: (objectId: string) => Promise<{records: ReturnType<typeof toCustomObjectRecordResponse>[]}>;
    createCustomObjectRecord: (objectId: string, input: CustomObjectRecordRequest) => Promise<{record: ReturnType<typeof toCustomObjectRecordResponse>}>;
    updateCustomObjectRecord: (objectId: string, recordId: string, input: CustomObjectRecordRequest) => Promise<{record: ReturnType<typeof toCustomObjectRecordResponse>}>;
    getCustomObjectRecord: (objectId: string, recordId: string) => Promise<{record: ReturnType<typeof toCustomObjectRecordResponse>}>;
    deleteCustomObjectRecord: (objectId: string, recordId: string) => Promise<void>;
};

export const createSettingsService = (repository: SettingsRepository): SettingsService => {
    const ensureDefaults = async () => {
        const existing = await repository.listSettings();
        const existingKeys = new Set(existing.map((setting) => setting.key));

        for (const definition of settingDefinitions) {
            await requireSettingsMigration(repository, definition.group);
            if (existingKeys.has(definition.key)) {
                continue;
            }

            const now = Date.now();
            await repository.upsertSetting({
                id: definition.key,
                key: definition.key,
                group: definition.group,
                type: definition.type,
                value: JSON.stringify(definition.defaultValue),
                createdAt: now,
                updatedAt: now
            });
        }
    };

    const listSettings = async () => {
        await ensureDefaults();
        const settings = await repository.listSettings();
        const normalized = settings.map(normalizeSetting).sort((left, right) => left.key.localeCompare(right.key));
        return {settings: normalized};
    };

    const updateSettings = async (input: SettingsUpdateRequest) => {
        await ensureDefaults();

        const updatedRecords: SettingResponse[] = [];
        for (const update of input.settings) {
            const definition = settingsByKey.get(update.key);
            if (!definition) {
                throw new HttpError(422, 'unknown_setting', `Unknown setting ${update.key}`);
            }

            if (definition.group === 'core' && !coreSettingAllowlist.has(definition.key)) {
                throw new HttpError(403, 'core_setting_forbidden', `Setting ${definition.key} is not allowed`);
            }

            await requireSettingsMigration(repository, definition.group);

            validateSettingValue(definition, update.value);
            const now = Date.now();
            const existing = await repository.getSettingByKey(definition.key);
            const record = await repository.upsertSetting({
                id: definition.key,
                key: definition.key,
                group: definition.group,
                type: definition.type,
                value: JSON.stringify(update.value),
                createdAt: existing?.createdAt ?? now,
                updatedAt: now
            });

            await repository.createSettingsEvent({
                id: randomUUID(),
                key: record.key,
                group: record.group,
                action: 'settings.updated',
                payload: JSON.stringify({key: record.key, value: update.value}),
                createdAt: now
            });

            updatedRecords.push(normalizeSetting(record));
        }

        return {settings: updatedRecords};
    };

    const migrateSettingsToMetafields = async (input: MetafieldMigrationRequest): Promise<MetafieldMigrationResponse> => {
        const existing = await repository.getMetafieldMigrationByVersion(input.version);
        if (existing) {
            throw new HttpError(409, 'metafield_migration_exists', 'Migration already applied');
        }

        await ensureDefaults();
        const settings = await repository.listSettings();
        const now = Date.now();
        const metafields = settings.map((setting) => ({
            id: `${setting.group}:${setting.key}`,
            key: setting.key,
            group: setting.group,
            type: setting.type,
            value: setting.value,
            createdAt: now,
            updatedAt: now
        }));

        await repository.createMetafields(metafields);
        const migration = await repository.createMetafieldMigration({
            id: randomUUID(),
            version: input.version,
            direction: 'forward',
            keys: JSON.stringify(metafields.map((entry) => entry.id)),
            createdAt: now,
            rolledBackAt: null
        });

        return {
            migration: {
                version: migration.version,
                direction: 'forward',
                createdAt: migration.createdAt,
                rolledBackAt: migration.rolledBackAt ?? null
            }
        };
    };

    const rollbackMetafieldMigration = async (input: MetafieldMigrationRequest): Promise<MetafieldMigrationResponse> => {
        const migration = await repository.getMetafieldMigrationByVersion(input.version);
        if (!migration) {
            throw new HttpError(404, 'metafield_migration_missing', 'Migration not found');
        }
        if (migration.rolledBackAt) {
            throw new HttpError(409, 'metafield_migration_rolled_back', 'Migration already rolled back');
        }

        const keys = JSON.parse(migration.keys) as string[];
        await repository.deleteMetafieldsByKeys(keys);
        const rolledBackAt = Date.now();
        await repository.markMetafieldMigrationRolledBack(migration.id, rolledBackAt);

        return {
            migration: {
                version: migration.version,
                direction: 'rollback',
                createdAt: migration.createdAt,
                rolledBackAt
            }
        };
    };

    const registerSettingsMigration = async (input: SettingsMigrationRequest): Promise<SettingsMigrationResponse> => {
        const existing = await repository.getSettingsMigrationByGroup(input.group);
        if (existing) {
            return {
                migration: {
                    id: existing.id,
                    group: existing.group,
                    createdAt: existing.createdAt
                }
            };
        }

        const migration = await repository.createSettingsMigration({
            id: randomUUID(),
            group: input.group,
            createdAt: Date.now()
        });

        migratedSettingGroups.add(migration.group);

        return {
            migration: {
                id: migration.id,
                group: migration.group,
                createdAt: migration.createdAt
            }
        };
    };

    const listCustomObjects = async () => {
        const objects = await repository.listCustomObjects();
        return {customObjects: objects.map(toCustomObjectResponse)};
    };

    const getCustomObject = async (id: string) => {
        const object = await repository.getCustomObjectById(id);
        if (!object) {
            throw new HttpError(404, 'custom_object_not_found', 'Custom object not found');
        }
        return {customObject: toCustomObjectResponse(object)};
    };

    const createCustomObject = async (input: CustomObjectCreateRequest) => {
        validateCustomObjectFields(input.fields);
        const existing = await repository.getCustomObjectBySlug(input.slug);
        if (existing) {
            throw new HttpError(422, 'custom_object_slug_exists', 'Custom object slug already exists');
        }

        const now = Date.now();
        const object = await repository.createCustomObject({
            id: randomUUID(),
            name: input.name,
            slug: input.slug,
            fields: JSON.stringify(input.fields),
            createdAt: now,
            updatedAt: now
        });
        return {customObject: toCustomObjectResponse(object)};
    };

    const updateCustomObject = async (id: string, input: CustomObjectUpdateRequest) => {
        validateCustomObjectFields(input.fields);
        const current = await repository.getCustomObjectById(id);
        if (!current) {
            throw new HttpError(404, 'custom_object_not_found', 'Custom object not found');
        }

        const existing = await repository.getCustomObjectBySlug(input.slug);
        if (existing && existing.id !== id) {
            throw new HttpError(422, 'custom_object_slug_exists', 'Custom object slug already exists');
        }

        const updated = await repository.updateCustomObject({
            ...current,
            name: input.name,
            slug: input.slug,
            fields: JSON.stringify(input.fields),
            updatedAt: Date.now()
        });
        return {customObject: toCustomObjectResponse(updated)};
    };

    const deleteCustomObject = async (id: string) => {
        const current = await repository.getCustomObjectById(id);
        if (!current) {
            throw new HttpError(404, 'custom_object_not_found', 'Custom object not found');
        }
        await repository.deleteCustomObject(id);
    };

    const listCustomObjectRecords = async (objectId: string) => {
        const object = await repository.getCustomObjectById(objectId);
        if (!object) {
            throw new HttpError(404, 'custom_object_not_found', 'Custom object not found');
        }
        const records = await repository.listCustomObjectRecords(objectId);
        return {records: records.map(toCustomObjectRecordResponse)};
    };

    const createCustomObjectRecord = async (objectId: string, input: CustomObjectRecordRequest) => {
        const object = await repository.getCustomObjectById(objectId);
        if (!object) {
            throw new HttpError(404, 'custom_object_not_found', 'Custom object not found');
        }
        const fields = parseFields(object);
        validateCustomObjectData(fields, input.data);
        const now = Date.now();
        const record = await repository.createCustomObjectRecord({
            id: randomUUID(),
            objectId,
            data: JSON.stringify(input.data),
            createdAt: now,
            updatedAt: now
        });
        return {record: toCustomObjectRecordResponse(record)};
    };

    const getCustomObjectRecord = async (objectId: string, recordId: string) => {
        const object = await repository.getCustomObjectById(objectId);
        if (!object) {
            throw new HttpError(404, 'custom_object_not_found', 'Custom object not found');
        }
        const record = await repository.getCustomObjectRecordById(recordId);
        if (!record || record.objectId !== objectId) {
            throw new HttpError(404, 'custom_object_record_not_found', 'Custom object record not found');
        }
        return {record: toCustomObjectRecordResponse(record)};
    };

    const updateCustomObjectRecord = async (objectId: string, recordId: string, input: CustomObjectRecordRequest) => {
        const object = await repository.getCustomObjectById(objectId);
        if (!object) {
            throw new HttpError(404, 'custom_object_not_found', 'Custom object not found');
        }
        const record = await repository.getCustomObjectRecordById(recordId);
        if (!record || record.objectId !== objectId) {
            throw new HttpError(404, 'custom_object_record_not_found', 'Custom object record not found');
        }
        const fields = parseFields(object);
        validateCustomObjectData(fields, input.data);
        const updated = await repository.updateCustomObjectRecord({
            ...record,
            data: JSON.stringify(input.data),
            updatedAt: Date.now()
        });
        return {record: toCustomObjectRecordResponse(updated)};
    };

    const deleteCustomObjectRecord = async (objectId: string, recordId: string) => {
        const object = await repository.getCustomObjectById(objectId);
        if (!object) {
            throw new HttpError(404, 'custom_object_not_found', 'Custom object not found');
        }
        const record = await repository.getCustomObjectRecordById(recordId);
        if (!record || record.objectId !== objectId) {
            throw new HttpError(404, 'custom_object_record_not_found', 'Custom object record not found');
        }
        await repository.deleteCustomObjectRecord(recordId);
    };

    return {
        listSettings,
        updateSettings,
        migrateSettingsToMetafields,
        rollbackMetafieldMigration,
        registerSettingsMigration,
        listCustomObjects,
        createCustomObject,
        updateCustomObject,
        getCustomObject,
        deleteCustomObject,
        listCustomObjectRecords,
        createCustomObjectRecord,
        updateCustomObjectRecord,
        getCustomObjectRecord,
        deleteCustomObjectRecord
    };
};
