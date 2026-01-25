import {describe, expect, it} from 'vitest';
import {createMediaService} from './service.js';
import type {MediaRepository} from './repo.js';

const createRepository = (): MediaRepository => {
    let config: {id: string; adapter: string; baseUrl: string | null} | null = null;
    return {
        createAsset: async (asset) => asset as {id: string; url: string; mimeType: string; size: number; createdAt: number},
        getAssetById: async () => null,
        upsertStorageConfig: async (input) => {
            config = {id: input.id, adapter: input.adapter, baseUrl: input.baseUrl ?? null};
            return config as {id: string; adapter: string; baseUrl: string | null};
        },
        getStorageConfig: async () => config as {id: string; adapter: string; baseUrl: string | null} | null
    };
};

describe('media service', () => {
    it('uploads assets', async () => {
        const repository = createRepository();
        const service = createMediaService(repository);

        const result = await service.uploadAsset({url: 'https://cdn.example/file.png', mimeType: 'image/png', size: 10});

        expect(result.asset.mimeType).toBe('image/png');
    });

    it('updates storage config', async () => {
        const repository = createRepository();
        const service = createMediaService(repository);

        const result = await service.updateStorageConfig({adapter: 's3', baseUrl: 'https://cdn.example'});

        expect(result.config.adapter).toBe('s3');
    });
});
