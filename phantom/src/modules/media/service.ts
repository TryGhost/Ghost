import {randomUUID} from 'node:crypto';
import type {MediaRepository} from './repo.js';
import type {
    LexicalRewriteRequest,
    LexicalRewriteResponse,
    MediaUploadRequest,
    MediaUploadResponse,
    StorageConfigRequest,
    StorageConfigResponse
} from './contracts.js';
import {HttpError} from '../../platform/http/errors.js';

export type MediaService = {
    uploadAsset: (input: MediaUploadRequest) => Promise<MediaUploadResponse>;
    updateStorageConfig: (input: StorageConfigRequest) => Promise<StorageConfigResponse>;
    rewriteLexicalUrls: (input: LexicalRewriteRequest) => Promise<LexicalRewriteResponse>;
};

const storageConfigId = 'storage';
const allowedMimePrefixes = ['image/', 'video/', 'audio/'];
const allowedMimeTypes = new Set(['application/pdf', 'application/zip', 'text/plain']);

export const createMediaService = (repository: MediaRepository): MediaService => {
    const uploadAsset = async (input: MediaUploadRequest) => {
        const isAllowed = allowedMimePrefixes.some((prefix) => input.mimeType.startsWith(prefix))
            || allowedMimeTypes.has(input.mimeType);
        if (!isAllowed) {
            throw new HttpError(415, 'unsupported_media_type', 'Unsupported mime type');
        }

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
            baseUrl: input.baseUrl ?? null,
            mediaBaseUrl: input.mediaBaseUrl ?? null,
            fileBaseUrl: input.fileBaseUrl ?? null
        });

        return {
            config: {
                id: config.id,
                adapter: config.adapter,
                baseUrl: config.baseUrl ?? undefined,
                mediaBaseUrl: config.mediaBaseUrl ?? undefined,
                fileBaseUrl: config.fileBaseUrl ?? undefined
            }
        };
    };

    const rewriteLexicalUrls = async (input: LexicalRewriteRequest) => {
        const config = await repository.getStorageConfig();
        const baseUrl = config?.baseUrl ?? null;
        const mediaBaseUrl = config?.mediaBaseUrl ?? baseUrl;
        const fileBaseUrl = config?.fileBaseUrl ?? baseUrl;

        const rewriteValue = (value: unknown): unknown => {
            if (Array.isArray(value)) {
                return value.map(rewriteValue);
            }

            if (value && typeof value === 'object') {
                const entries = Object.entries(value as Record<string, unknown>);
                return Object.fromEntries(entries.map(([key, child]) => [key, rewriteValue(child)]));
            }

            if (typeof value === 'string') {
                if (mediaBaseUrl && value.startsWith(mediaBaseUrl)) {
                    return value;
                }
                if (fileBaseUrl && value.startsWith(fileBaseUrl)) {
                    return value;
                }
                if (mediaBaseUrl && (value.startsWith('/content/images/') || value.startsWith('/content/media/'))) {
                    return `${mediaBaseUrl}${value}`;
                }
                if (fileBaseUrl && value.startsWith('/content/files/')) {
                    return `${fileBaseUrl}${value}`;
                }
            }

            return value;
        };

        return {
            lexical: rewriteValue(input.lexical) as Record<string, unknown>
        };
    };

    return {
        uploadAsset,
        updateStorageConfig,
        rewriteLexicalUrls
    };
};
