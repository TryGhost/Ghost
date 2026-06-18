import {createRoute} from '@hono/zod-openapi';
import type {ExtensionsService} from './service.js';
import {
    ExtensionIdParamSchema,
    ExtensionInstallRequestBodySchema,
    ExtensionInstallResponseSchema,
    ExtensionRegistryRequestQuerySchema,
    ExtensionRegistryResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import type {StaffAuthService} from '../identity/service.js';
import {requireStaffRole} from '../identity/auth.js';

export const createExtensionsRouter = (service: ExtensionsService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const registryRoute = createRoute({
        method: 'get',
        path: '/registry',
        request: {
            query: ExtensionRegistryRequestQuerySchema
        },
        responses: {
            200: {
                description: 'Registry listings',
                content: {
                    'application/json': {
                        schema: ExtensionRegistryResponseSchema
                    }
                }
            }
        }
    });

    const installRoute = createRoute({
        method: 'post',
        path: '/install',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: ExtensionInstallRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Extension installed',
                content: {
                    'application/json': {
                        schema: ExtensionInstallResponseSchema
                    }
                }
            }
        }
    });

    const uninstallRoute = createRoute({
        method: 'delete',
        path: '/install/{id}',
        request: {
            params: ExtensionIdParamSchema
        },
        responses: {
            204: {
                description: 'Extension removed'
            }
        }
    });

    router.openapi(registryRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const result = await service.listRegistry();
        return context.json(result);
    });

    router.openapi(installRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.installExtension(input);
        return context.json(result);
    });

    router.openapi(uninstallRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const params = context.req.valid('param');
        await service.uninstallExtension(params.id);
        return context.body(null, 204);
    });

    return router;
};
