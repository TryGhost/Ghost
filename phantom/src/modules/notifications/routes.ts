import {createRoute} from '@hono/zod-openapi';
import type {NotificationService} from './service.js';
import {
    NotificationCreateRequestSchema,
    NotificationCreateResponseSchema,
    NotificationIdParamSchema,
    NotificationListResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import type {StaffAuthService} from '../identity/service.js';
import {requireStaffRole} from '../identity/auth.js';

export const createNotificationRouter = (service: NotificationService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const listRoute = createRoute({
        method: 'get',
        path: '/',
        responses: {
            200: {
                description: 'Notifications',
                content: {
                    'application/json': {
                        schema: NotificationListResponseSchema
                    }
                }
            }
        }
    });

    const createRouteDef = createRoute({
        method: 'post',
        path: '/',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: NotificationCreateRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Notification created',
                content: {
                    'application/json': {
                        schema: NotificationCreateResponseSchema
                    }
                }
            }
        }
    });

    const deleteRoute = createRoute({
        method: 'delete',
        path: '/{id}',
        request: {
            params: NotificationIdParamSchema
        },
        responses: {
            204: {
                description: 'Notification deleted'
            }
        }
    });

    router.openapi(listRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const result = await service.listNotifications();
        return context.json(result);
    });

    router.openapi(createRouteDef, async (context) => {
        const staff = await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.createNotification(staff.id, input);
        return context.json(result);
    });

    router.openapi(deleteRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const params = context.req.valid('param');
        await service.deleteNotification(params.id);
        return context.body(null, 204);
    });

    return router;
};
