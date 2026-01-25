import {createRoute} from '@hono/zod-openapi';
import type {WebhookService} from './service.js';
import {
    WebhookCreateRequestBodySchema,
    WebhookCreateResponseSchema,
    WebhookDispatchRequestBodySchema,
    WebhookDispatchResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import {requireStaffRole} from '../identity/auth.js';
import type {StaffAuthService} from '../identity/service.js';

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

    router.openapi(createRouteDef, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.createWebhook(input);
        return context.json(result);
    });

    router.openapi(dispatchRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.dispatchEvent(input);
        return context.json(result);
    });

    return router;
};
