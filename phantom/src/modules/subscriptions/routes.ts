import {createRoute} from '@hono/zod-openapi';
import type {SubscriptionService} from './service.js';
import {
    CheckoutConfirmRequestBodySchema,
    CheckoutConfirmResponseSchema,
    CheckoutSessionRequestBodySchema,
    CheckoutSessionResponseSchema,
    OfferCreateRequestBodySchema,
    OfferCreateResponseSchema,
    PlanCreateRequestBodySchema,
    PlanCreateResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import {requireStaffRole} from '../identity/auth.js';
import type {StaffAuthService} from '../identity/service.js';

export const createSubscriptionsRouter = (service: SubscriptionService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const planRoute = createRoute({
        method: 'post',
        path: '/plans',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: PlanCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Plan created',
                content: {
                    'application/json': {
                        schema: PlanCreateResponseSchema
                    }
                }
            }
        }
    });

    const offerRoute = createRoute({
        method: 'post',
        path: '/offers',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: OfferCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Offer created',
                content: {
                    'application/json': {
                        schema: OfferCreateResponseSchema
                    }
                }
            }
        }
    });

    const checkoutRoute = createRoute({
        method: 'post',
        path: '/checkout',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: CheckoutSessionRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Checkout session created',
                content: {
                    'application/json': {
                        schema: CheckoutSessionResponseSchema
                    }
                }
            }
        }
    });

    const checkoutConfirmRoute = createRoute({
        method: 'post',
        path: '/checkout/confirm',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: CheckoutConfirmRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Checkout confirmed',
                content: {
                    'application/json': {
                        schema: CheckoutConfirmResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(planRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.createPlan(input);
        return context.json(result);
    });

    router.openapi(offerRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.createOffer(input);
        return context.json(result);
    });

    router.openapi(checkoutRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.createCheckoutSession(input);
        return context.json(result);
    });

    router.openapi(checkoutConfirmRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.confirmCheckoutSession(input);
        return context.json(result);
    });

    return router;
};
