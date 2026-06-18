import {z} from 'zod';

export const MediaAssetSchema = z.object({
    id: z.string().min(1),
    url: z.string().min(1),
    mimeType: z.string().min(1),
    size: z.number().int().positive()
});

export const StorageConfigSchema = z.object({
    id: z.string().min(1),
    adapter: z.string().min(1),
    baseUrl: z.string().min(1).optional(),
    mediaBaseUrl: z.string().min(1).optional(),
    fileBaseUrl: z.string().min(1).optional()
});

export const MediaUploadRequestSchema = z.object({
    url: z.string().min(1),
    mimeType: z.string().min(1),
    size: z.number().int().positive()
});

export const MediaUploadResponseSchema = z.object({
    asset: MediaAssetSchema
});

export const StorageConfigRequestSchema = z.object({
    adapter: z.string().min(1),
    baseUrl: z.string().min(1).optional(),
    mediaBaseUrl: z.string().min(1).optional(),
    fileBaseUrl: z.string().min(1).optional()
});

export const StorageConfigResponseSchema = z.object({
    config: StorageConfigSchema
});

export const LexicalRewriteRequestSchema = z.object({
    lexical: z.record(z.unknown())
});

export const LexicalRewriteResponseSchema = z.object({
    lexical: z.record(z.unknown())
});

export const MediaUploadRequestBodySchema = MediaUploadRequestSchema;
export const StorageConfigRequestBodySchema = StorageConfigRequestSchema;
export const LexicalRewriteRequestBodySchema = LexicalRewriteRequestSchema;

export type MediaUploadRequest = z.infer<typeof MediaUploadRequestSchema>;
export type MediaUploadResponse = z.infer<typeof MediaUploadResponseSchema>;
export type StorageConfigRequest = z.infer<typeof StorageConfigRequestSchema>;
export type StorageConfigResponse = z.infer<typeof StorageConfigResponseSchema>;
export type LexicalRewriteRequest = z.infer<typeof LexicalRewriteRequestSchema>;
export type LexicalRewriteResponse = z.infer<typeof LexicalRewriteResponseSchema>;
