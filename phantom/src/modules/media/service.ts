import {randomUUID} from 'node:crypto';
import type {MediaRepository} from './repo.js';
import type {
    MediaUploadRequest,
    MediaUploadResponse,
    StorageConfigRequest,
    StorageConfigResponse
} from './contracts.js';

export type MediaService = {
    uploadAsset: (input: MediaUploadRequest) => Promise<MediaUploadResponse>;
    updateStorageConfig: (input: StorageConfigRequest) => Promise<StorageConfigResponse>;
};

const storageConfigId = 'storage';

export const createMediaService = (repository: MediaRepository): MediaService => {
    const uploadAsset = async (input: MediaUploadRequest) => {
        const asset = await repository.createAsset({
            id: randomUUID(),
            url: input.url,
            mimeType: input.mimeType,
            size: input.size,
            createdAt: Date.now()
        });

        return {
            asset: {
                id: asset.id,
                url: asset.url,
                mimeType: asset.mimeType,
                size: asset.size
            }
        };
    };

    const updateStorageConfig = async (input: StorageConfigRequest) => {
        const config = await repository.upsertStorageConfig({
            id: storageConfigId,
            adapter: input.adapter,
            baseUrl: input.baseUrl ?? null
        });

        return {
            config: {
                id: config.id,
                adapter: config.adapter,
                baseUrl: config.baseUrl ?? undefined
            }
        };
    };

    return {
        uploadAsset,
        updateStorageConfig
    };
};
