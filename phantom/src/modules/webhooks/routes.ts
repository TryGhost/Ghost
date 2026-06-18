import {createRoute} from '@hono/zod-openapi';
import type {WebhookService} from './service.js';
import {
    WebhookCreateRequestBodySchema,
    WebhookCreateResponseSchema,
    WebhookDispatchRequestBodySchema,
    WebhookDispatchResponseSchema,
    WebhookIdParamSchema,
    WebhookListResponseSchema,
    WebhookUpdateRequestBodySchema,
    WebhookUpdateResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import {requireIntegrationToken, requireStaffRole} from '../identity/auth.js';
import type {StaffAuthService} from '../identity/service.js';
import {HttpError} from '../../platform/http/errors.js';

export const createWebhookRouter = (service: WebhookService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const createRouteDef = createRoute({
        method: 'post',
        path: '/',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: WebhookCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Webhook created',
                content: {
                    'application/json': {
                        schema: WebhookCreateResponseSchema
                    }
                }
            }
        }
    });

    const dispatchRoute = createRoute({
        method: 'post',
        path: '/dispatch',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: WebhookDispatchRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Dispatch queued',
                content: {
                    'application/json': {
                        schema: WebhookDispatchResponseSchema
                    }
                }
            }
        }
    });

    const listRoute = createRoute({
        method: 'get',
        path: '/',
        responses: {
            200: {
                description: 'Webhooks',
                content: {
                    'application/json': {
                        schema: WebhookListResponseSchema
                    }
                }
            }
        }
    });

    const updateRoute = createRoute({
        method: 'put',
        path: '/{id}',
        request: {
            params: WebhookIdParamSchema,
            body: {
                content: {
                    'application/json': {
                        schema: WebhookUpdateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Webhook updated',
                content: {
                    'application/json': {
                        schema: WebhookUpdateResponseSchema
                    }
                }
            }
        }
    });

    const deleteRoute = createRoute({
        method: 'delete',
        path: '/{id}',
        request: {
            params: WebhookIdParamSchema
        },
        responses: {
            204: {
                description: 'Webhook deleted'
            }
        }
    });

    router.openapi(createRouteDef, async (context) => {
        const integration = await requireIntegrationToken(context, staffAuthService);
        const input = context.req.valid('json');
        if (input.integrationId !== integration.id) {
            throw new HttpError(422, 'integration_mismatch', 'Integration token does not match request');
        }
        const result = await service.createWebhook(input);
        return context.json(result);
    });

    router.openapi(listRoute, async (context) => {
        const integration = await requireIntegrationToken(context, staffAuthService);
        const result = await service.listWebhooks(integration.id);
        return context.json(result);
    });

    router.openapi(updateRoute, async (context) => {
        const integration = await requireIntegrationToken(context, staffAuthService);
        const params = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await service.updateWebhook(integration.id, params.id, input);
        return context.json(result);
    });

    router.openapi(deleteRoute, async (context) => {
        const integration = await requireIntegrationToken(context, staffAuthService);
        const params = context.req.valid('param');
        await service.deleteWebhook(integration.id, params.id);
        return context.body(null, 204);
    });

    router.openapi(dispatchRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.dispatchEvent(input);
        return context.json(result);
    });

    return router;
};
