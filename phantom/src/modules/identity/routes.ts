import {createRoute} from '@hono/zod-openapi';
import type {StaffAuthService} from './service.js';
import {
    LoginRequestBodySchema,
    LoginResponseSchema,
    PasswordResetConfirmBodySchema,
    PasswordResetConfirmResponseSchema,
    PasswordResetRequestBodySchema,
    PasswordResetResponseSchema,
    StaffInviteAcceptBodySchema,
    StaffInviteAcceptResponseSchema,
    StaffInviteRequestBodySchema,
    StaffInviteResponseSchema,
    StaffApiTokenCreateBodySchema,
    StaffApiTokenCreateResponseSchema,
    IntegrationTokenCreateBodySchema,
    IntegrationTokenCreateResponseSchema,
    TokenIdParamRequestSchema,
    StaffVerificationRequestBodySchema,
    StaffVerificationResponseSchema,
    StaffMeResponseSchema
} from './contracts.js';
import {HttpError} from '../../platform/http/errors.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import {getBearerToken, requireStaffRole} from './auth.js';

const loginRoute = createRoute({
    method: 'post',
    path: '/login',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: LoginRequestBodySchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Staff login response',
            content: {
                'application/json': {
                    schema: LoginResponseSchema
                }
            }
        }
    }
});

const meRoute = createRoute({
    method: 'get',
    path: '/me',
    responses: {
        200: {
            description: 'Current staff profile',
            content: {
                'application/json': {
                    schema: StaffMeResponseSchema
                }
            }
        }
    }
});

const logoutRoute = createRoute({
    method: 'post',
    path: '/logout',
    responses: {
        204: {
            description: 'Session revoked'
        }
    }
});

const passwordResetRequestRoute = createRoute({
    method: 'post',
    path: '/password-reset',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: PasswordResetRequestBodySchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Password reset issued',
            content: {
                'application/json': {
                    schema: PasswordResetResponseSchema
                }
            }
        }
    }
});

const passwordResetConfirmRoute = createRoute({
    method: 'post',
    path: '/password-reset/confirm',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: PasswordResetConfirmBodySchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Password reset confirmed',
            content: {
                'application/json': {
                    schema: PasswordResetConfirmResponseSchema
                }
            }
        }
    }
});

const staffInviteRoute = createRoute({
    method: 'post',
    path: '/invitations',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: StaffInviteRequestBodySchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Staff invite issued',
            content: {
                'application/json': {
                    schema: StaffInviteResponseSchema
                }
            }
        }
    }
});

const staffInviteAcceptRoute = createRoute({
    method: 'post',
    path: '/invitations/accept',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: StaffInviteAcceptBodySchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Staff invite accepted',
            content: {
                'application/json': {
                    schema: StaffInviteAcceptResponseSchema
                }
            }
        }
    }
});

const staffApiTokenCreateRoute = createRoute({
    method: 'post',
    path: '/api-tokens',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: StaffApiTokenCreateBodySchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Staff API token created',
            content: {
                'application/json': {
                    schema: StaffApiTokenCreateResponseSchema
                }
            }
        }
    }
});

const staffApiTokenRevokeRoute = createRoute({
    method: 'delete',
    path: '/api-tokens/{id}',
    request: {
        params: TokenIdParamRequestSchema
    },
    responses: {
        204: {
            description: 'Staff API token revoked'
        }
    }
});

const integrationTokenCreateRoute = createRoute({
    method: 'post',
    path: '/integration-tokens',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: IntegrationTokenCreateBodySchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Integration token created',
            content: {
                'application/json': {
                    schema: IntegrationTokenCreateResponseSchema
                }
            }
        }
    }
});

const integrationTokenRevokeRoute = createRoute({
    method: 'delete',
    path: '/integration-tokens/{id}',
    request: {
        params: TokenIdParamRequestSchema
    },
    responses: {
        204: {
            description: 'Integration token revoked'
        }
    }
});

const verificationRoute = createRoute({
    method: 'post',
    path: '/verify',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: StaffVerificationRequestBodySchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Staff verification complete',
            content: {
                'application/json': {
                    schema: StaffVerificationResponseSchema
                }
            }
        }
    }
});

export const createIdentityRouter = (service: StaffAuthService) => {
    const router = createOpenApiRouter();

    router.openapi(loginRoute, async (context) => {
        const input = context.req.valid('json');
        const ipAddress = context.req.header('x-forwarded-for') ?? 'unknown';
        const result = await service.login(input, ipAddress);

        return context.json(result);
    });

    router.openapi(meRoute, async (context) => {
        const token = getBearerToken(context);
        if (!token) {
            throw new HttpError(401, 'missing_session', 'Missing session token');
        }

        const staff = await service.getStaffBySession(token);
        return context.json({staff});
    });

    router.openapi(logoutRoute, async (context) => {
        const token = getBearerToken(context);
        if (!token) {
            throw new HttpError(401, 'missing_session', 'Missing session token');
        }

        await service.logout(token);
        return context.body(null, 204);
    });

    router.openapi(passwordResetRequestRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.requestPasswordReset(input);
        return context.json(result);
    });

    router.openapi(passwordResetConfirmRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.resetPassword(input);
        return context.json(result);
    });

    router.openapi(staffInviteRoute, async (context) => {
        await requireStaffRole(context, service, ['admin']);

        const input = context.req.valid('json');
        const result = await service.createStaffInvite(input);
        return context.json(result);
    });

    router.openapi(staffInviteAcceptRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.acceptStaffInvite(input);
        return context.json(result);
    });

    router.openapi(staffApiTokenCreateRoute, async (context) => {
        const staff = await requireStaffRole(context, service, ['admin']);
        const input = context.req.valid('json');
        const result = await service.createStaffApiToken(staff.id, input);
        return context.json(result);
    });

    router.openapi(staffApiTokenRevokeRoute, async (context) => {
        const staff = await requireStaffRole(context, service, ['admin']);
        const params = context.req.valid('param');
        await service.revokeStaffApiToken(staff.id, params.id);
        return context.body(null, 204);
    });

    router.openapi(integrationTokenCreateRoute, async (context) => {
        await requireStaffRole(context, service, ['admin']);
        const input = context.req.valid('json');
        const result = await service.createIntegrationToken(input);
        return context.json(result);
    });

    router.openapi(integrationTokenRevokeRoute, async (context) => {
        await requireStaffRole(context, service, ['admin']);
        const params = context.req.valid('param');
        await service.revokeIntegrationToken(params.id);
        return context.body(null, 204);
    });

    router.openapi(verificationRoute, async (context) => {
        const input = context.req.valid('json');
        const result = await service.verifyStaffAuthFactor(input);
        return context.json(result);
    });

    return router;
};
