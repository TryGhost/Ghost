import {createRoute} from '@hono/zod-openapi';
import type {OperationsService} from './service.js';
import {
    ExportRequestBodySchema,
    ExportResponseSchema,
    FixtureRequestBodySchema,
    FixtureResponseSchema,
    ImportRequestBodySchema,
    ImportResponseSchema,
    MailgunEventRequestBodySchema,
    MailgunEventResponseSchema,
    MetricsConfigRequestBodySchema,
    MetricsConfigResponseSchema,
    MigrationRequestBodySchema,
    MigrationResponseSchema,
    NullableMigrationRequestBodySchema,
    NullableMigrationResponseSchema,
    OutboxProcessResponseSchema,
    TokenCleanupResponseSchema,
    UpdateCheckResponseSchema,
    UrlGenerateRequestBodySchema,
    UrlGenerateResponseSchema,
    WelcomeEmailRequestBodySchema,
    WelcomeEmailResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import type {StaffAuthService} from '../identity/service.js';
import {requireStaffRole} from '../identity/auth.js';

export const createOperationsRouter = (service: OperationsService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const exportRoute = createRoute({
        method: 'post',
        path: '/export',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: ExportRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Export started',
                content: {
                    'application/json': {
                        schema: ExportResponseSchema
                    }
                }
            }
        }
    });

    const importRoute = createRoute({
        method: 'post',
        path: '/import',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: ImportRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Import started',
                content: {
                    'application/json': {
                        schema: ImportResponseSchema
                    }
                }
            }
        }
    });

    const migrationRoute = createRoute({
        method: 'post',
        path: '/migrations',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: MigrationRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Migration run',
                content: {
                    'application/json': {
                        schema: MigrationResponseSchema
                    }
                }
            }
        }
    });

    const fixtureRoute = createRoute({
        method: 'post',
        path: '/fixtures',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: FixtureRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Fixtures seeded',
                content: {
                    'application/json': {
                        schema: FixtureResponseSchema
                    }
                }
            }
        }
    });

    const nullableMigrationRoute = createRoute({
        method: 'post',
        path: '/migrations/nullable',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: NullableMigrationRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Nullable migration tracked',
                content: {
                    'application/json': {
                        schema: NullableMigrationResponseSchema
                    }
                }
            }
        }
    });

    const urlRoute = createRoute({
        method: 'post',
        path: '/urls',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: UrlGenerateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'URL generated',
                content: {
                    'application/json': {
                        schema: UrlGenerateResponseSchema
                    }
                }
            }
        }
    });

    const mailgunRoute = createRoute({
        method: 'post',
        path: '/mailgun/events',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: MailgunEventRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Mailgun event stored',
                content: {
                    'application/json': {
                        schema: MailgunEventResponseSchema
                    }
                }
            }
        }
    });

    const welcomeRoute = createRoute({
        method: 'post',
        path: '/welcome-emails',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: WelcomeEmailRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Welcome email queued',
                content: {
                    'application/json': {
                        schema: WelcomeEmailResponseSchema
                    }
                }
            }
        }
    });

    const updateCheckRoute = createRoute({
        method: 'post',
        path: '/update-check',
        responses: {
            200: {
                description: 'Update check done',
                content: {
                    'application/json': {
                        schema: UpdateCheckResponseSchema
                    }
                }
            }
        }
    });

    const tokenCleanupRoute = createRoute({
        method: 'post',
        path: '/token-cleanup',
        responses: {
            200: {
                description: 'Token cleanup complete',
                content: {
                    'application/json': {
                        schema: TokenCleanupResponseSchema
                    }
                }
            }
        }
    });

    const outboxRoute = createRoute({
        method: 'post',
        path: '/outbox/process',
        responses: {
            200: {
                description: 'Outbox processed',
                content: {
                    'application/json': {
                        schema: OutboxProcessResponseSchema
                    }
                }
            }
        }
    });

    const metricsRoute = createRoute({
        method: 'put',
        path: '/metrics',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: MetricsConfigRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Metrics config updated',
                content: {
                    'application/json': {
                        schema: MetricsConfigResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(exportRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.exportData(input);
        return context.json(result);
    });

    router.openapi(importRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.importData(input);
        return context.json(result);
    });

    router.openapi(migrationRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.runMigration(input);
        return context.json(result);
    });

    router.openapi(fixtureRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        context.req.valid('json');
        const result = await service.seedFixtures();
        return context.json(result);
    });

    router.openapi(nullableMigrationRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.toggleNullableMigration(input);
        return context.json(result);
    });

    router.openapi(urlRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.generateUrl(input);
        return context.json(result);
    });

    router.openapi(mailgunRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.recordMailgunEvent(input);
        return context.json(result);
    });

    router.openapi(welcomeRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.queueWelcomeEmail(input);
        return context.json(result);
    });

    router.openapi(updateCheckRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const result = await service.runUpdateCheck();
        return context.json(result);
    });

    router.openapi(tokenCleanupRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const result = await service.cleanupTokens();
        return context.json(result);
    });

    router.openapi(outboxRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const result = await service.processOutbox();
        return context.json(result);
    });

    router.openapi(metricsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.updateMetricsConfig(input);
        return context.json(result);
    });

    return router;
};
