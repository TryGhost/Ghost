import {createRoute} from '@hono/zod-openapi';
import type {BillingService} from './service.js';
import {
    BillingProfileLinkRequestBodySchema,
    BillingProfileLinkResponseSchema,
    BillingProfileResponseSchema,
    MarketplaceEntitlementListResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import type {StaffAuthService} from '../identity/service.js';
import {requireStaffRole} from '../identity/auth.js';

export const createBillingRouter = (service: BillingService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const linkRoute = createRoute({
        method: 'post',
        path: '/profile',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: BillingProfileLinkRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Profile linked',
                content: {
                    'application/json': {
                        schema: BillingProfileLinkResponseSchema
                    }
                }
            }
        }
    });

    const unlinkRoute = createRoute({
        method: 'delete',
        path: '/profile',
        responses: {
            200: {
                description: 'Profile unlinked',
                content: {
                    'application/json': {
                        schema: BillingProfileResponseSchema
                    }
                }
            }
        }
    });

    const listEntitlementsRoute = createRoute({
        method: 'get',
        path: '/entitlements',
        responses: {
            200: {
                description: 'Marketplace entitlements',
                content: {
                    'application/json': {
                        schema: MarketplaceEntitlementListResponseSchema
                    }
                }
            }
        }
    });

    const refreshEntitlementsRoute = createRoute({
        method: 'post',
        path: '/entitlements/refresh',
        responses: {
            200: {
                description: 'Marketplace entitlements refreshed',
                content: {
                    'application/json': {
                        schema: MarketplaceEntitlementListResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(linkRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.linkProfile(input);
        return context.json(result);
    });

    router.openapi(unlinkRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const result = await service.unlinkProfile();
        return context.json(result);
    });

    router.openapi(listEntitlementsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const result = await service.listEntitlements();
        return context.json(result);
    });

    router.openapi(refreshEntitlementsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const result = await service.refreshEntitlements();
        return context.json(result);
    });

    return router;
};
