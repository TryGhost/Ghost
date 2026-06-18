import {createRoute} from '@hono/zod-openapi';
import type {LinkService} from './service.js';
import {
    LinkBulkUpdateRequestBodySchema,
    LinkBulkUpdateResponseSchema,
    LinkClickRequestBodySchema,
    LinkClickResponseSchema,
    LinkCreateRequestBodySchema,
    LinkCreateResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import {requireStaffRole} from '../identity/auth.js';
import type {StaffAuthService} from '../identity/service.js';

export const createLinksRouter = (service: LinkService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const createRouteDef = createRoute({
        method: 'post',
        path: '/',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: LinkCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Link created',
                content: {
                    'application/json': {
                        schema: LinkCreateResponseSchema
                    }
                }
            }
        }
    });

    const bulkRoute = createRoute({
        method: 'post',
        path: '/bulk',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: LinkBulkUpdateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Bulk update complete',
                content: {
                    'application/json': {
                        schema: LinkBulkUpdateResponseSchema
                    }
                }
            }
        }
    });

    const clickRoute = createRoute({
        method: 'post',
        path: '/clicks',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: LinkClickRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Click recorded',
                content: {
                    'application/json': {
                        schema: LinkClickResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(createRouteDef, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.createLink(input);
        return context.json(result);
    });

    router.openapi(bulkRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.bulkUpdateLinks(input);
        return context.json(result);
    });

    router.openapi(clickRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.recordClick(input);
        return context.json(result);
    });

    return router;
};
