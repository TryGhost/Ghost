import {eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    mediaAssetTable,
    storageConfigTable,
    type MediaAssetRecord,
    type NewMediaAssetRecord,
    type NewStorageConfigRecord,
    type StorageConfigRecord
} from './db.js';

export type MediaRepository = {
    createAsset: (asset: NewMediaAssetRecord) => Promise<MediaAssetRecord>;
    getAssetById: (id: string) => Promise<MediaAssetRecord | null>;
    upsertStorageConfig: (config: NewStorageConfigRecord) => Promise<StorageConfigRecord>;
    getStorageConfig: () => Promise<StorageConfigRecord | null>;
};

export const createMediaRepository = (db: DbClient): MediaRepository => {
    const createAsset = async (asset: NewMediaAssetRecord) => {
        await db.insert(mediaAssetTable).values(asset);
        const rows = await db.select().from(mediaAssetTable).where(eq(mediaAssetTable.id, asset.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Media asset missing after insert');
        }
        return rows[0];
    };

    const getAssetById = async (id: string) => {
        const rows = await db.select().from(mediaAssetTable).where(eq(mediaAssetTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const upsertStorageConfig = async (config: NewStorageConfigRecord) => {
        await db.insert(storageConfigTable).values(config)
            .onConflictDoUpdate({target: storageConfigTable.id, set: config});
        const rows = await db.select().from(storageConfigTable).where(eq(storageConfigTable.id, config.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Storage config missing after upsert');
        }
        return rows[0];
    };

    const getStorageConfig = async () => {
        const rows = await db.select().from(storageConfigTable).limit(1);
        return rows[0] ?? null;
    };

    return {
        createAsset,
        getAssetById,
        upsertStorageConfig,
        getStorageConfig
    };
};
