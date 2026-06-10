import {createRoute} from '@hono/zod-openapi';
import type {MediaService} from './service.js';
import {
    LexicalRewriteRequestBodySchema,
    LexicalRewriteResponseSchema,
    MediaUploadRequestBodySchema,
    MediaUploadResponseSchema,
    StorageConfigRequestBodySchema,
    StorageConfigResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import {requireStaffRole} from '../identity/auth.js';
import type {StaffAuthService} from '../identity/service.js';

export const createMediaRouter = (service: MediaService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const uploadRoute = createRoute({
        method: 'post',
        path: '/assets',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: MediaUploadRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Asset uploaded',
                content: {
                    'application/json': {
                        schema: MediaUploadResponseSchema
                    }
                }
            }
        }
    });

    const configRoute = createRoute({
        method: 'put',
        path: '/config',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: StorageConfigRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Storage config updated',
                content: {
                    'application/json': {
                        schema: StorageConfigResponseSchema
                    }
                }
            }
        }
    });

    const rewriteRoute = createRoute({
        method: 'post',
        path: '/rewrite',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: LexicalRewriteRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Lexical URLs rewritten',
                content: {
                    'application/json': {
                        schema: LexicalRewriteResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(uploadRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.uploadAsset(input);
        return context.json(result);
    });

    router.openapi(configRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.updateStorageConfig(input);
        return context.json(result);
    });

    router.openapi(rewriteRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor', 'author']);
        const input = context.req.valid('json');
        const result = await service.rewriteLexicalUrls(input);
        return context.json(result);
    });

    return router;
};
