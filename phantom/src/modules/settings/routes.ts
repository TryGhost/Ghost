import {createRoute} from '@hono/zod-openapi';
import type {SettingsService} from './service.js';
import {
    CustomObjectCreateRequestSchema,
    CustomObjectIdParamSchema,
    CustomObjectListResponseSchema,
    CustomObjectRecordListResponseSchema,
    CustomObjectRecordParamsSchema,
    CustomObjectRecordRequestSchema,
    CustomObjectRecordResponseSchema,
    CustomObjectResponseSchema,
    CustomObjectUpdateRequestSchema,
    MetafieldMigrationRequestSchema,
    MetafieldMigrationResponseSchema,
    SettingsMigrationRequestSchema,
    SettingsMigrationResponseSchema,
    SettingsListResponseSchema,
    SettingsUpdateRequestSchema,
    SettingsUpdateResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import type {StaffAuthService} from '../identity/service.js';
import {requireStaffRole} from '../identity/auth.js';

export const createSettingsRouter = (service: SettingsService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const listSettingsRoute = createRoute({
        method: 'get',
        path: '/',
        responses: {
            200: {
                description: 'List settings',
                content: {
                    'application/json': {
                        schema: SettingsListResponseSchema
                    }
                }
            }
        }
    });

    const updateSettingsRoute = createRoute({
        method: 'put',
        path: '/',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: SettingsUpdateRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Settings updated',
                content: {
                    'application/json': {
                        schema: SettingsUpdateResponseSchema
                    }
                }
            }
        }
    });

    const migrateMetafieldsRoute = createRoute({
        method: 'post',
        path: '/metafields/migrate',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: MetafieldMigrationRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Metafield migration',
                content: {
                    'application/json': {
                        schema: MetafieldMigrationResponseSchema
                    }
                }
            }
        }
    });

    const rollbackMetafieldsRoute = createRoute({
        method: 'post',
        path: '/metafields/rollback',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: MetafieldMigrationRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Metafield rollback',
                content: {
                    'application/json': {
                        schema: MetafieldMigrationResponseSchema
                    }
                }
            }
        }
    });

    const settingsMigrationRoute = createRoute({
        method: 'post',
        path: '/migrations',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: SettingsMigrationRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Settings migration registered',
                content: {
                    'application/json': {
                        schema: SettingsMigrationResponseSchema
                    }
                }
            }
        }
    });

    const listCustomObjectsRoute = createRoute({
        method: 'get',
        path: '/custom-objects',
        responses: {
            200: {
                description: 'Custom objects',
                content: {
                    'application/json': {
                        schema: CustomObjectListResponseSchema
                    }
                }
            }
        }
    });

    const createCustomObjectRoute = createRoute({
        method: 'post',
        path: '/custom-objects',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: CustomObjectCreateRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Custom object created',
                content: {
                    'application/json': {
                        schema: CustomObjectResponseSchema
                    }
                }
            }
        }
    });

    const getCustomObjectRoute = createRoute({
        method: 'get',
        path: '/custom-objects/{id}',
        request: {
            params: CustomObjectIdParamSchema
        },
        responses: {
            200: {
                description: 'Custom object',
                content: {
                    'application/json': {
                        schema: CustomObjectResponseSchema
                    }
                }
            }
        }
    });

    const updateCustomObjectRoute = createRoute({
        method: 'put',
        path: '/custom-objects/{id}',
        request: {
            params: CustomObjectIdParamSchema,
            body: {
                content: {
                    'application/json': {
                        schema: CustomObjectUpdateRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Custom object updated',
                content: {
                    'application/json': {
                        schema: CustomObjectResponseSchema
                    }
                }
            }
        }
    });

    const deleteCustomObjectRoute = createRoute({
        method: 'delete',
        path: '/custom-objects/{id}',
        request: {
            params: CustomObjectIdParamSchema
        },
        responses: {
            204: {
                description: 'Custom object deleted'
            }
        }
    });

    const listCustomObjectRecordsRoute = createRoute({
        method: 'get',
        path: '/custom-objects/{id}/records',
        request: {
            params: CustomObjectIdParamSchema
        },
        responses: {
            200: {
                description: 'Custom object records',
                content: {
                    'application/json': {
                        schema: CustomObjectRecordListResponseSchema
                    }
                }
            }
        }
    });

    const createCustomObjectRecordRoute = createRoute({
        method: 'post',
        path: '/custom-objects/{id}/records',
        request: {
            params: CustomObjectIdParamSchema,
            body: {
                content: {
                    'application/json': {
                        schema: CustomObjectRecordRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Custom object record created',
                content: {
                    'application/json': {
                        schema: CustomObjectRecordResponseSchema
                    }
                }
            }
        }
    });

    const getCustomObjectRecordRoute = createRoute({
        method: 'get',
        path: '/custom-objects/{id}/records/{recordId}',
        request: {
            params: CustomObjectRecordParamsSchema
        },
        responses: {
            200: {
                description: 'Custom object record',
                content: {
                    'application/json': {
                        schema: CustomObjectRecordResponseSchema
                    }
                }
            }
        }
    });

    const updateCustomObjectRecordRoute = createRoute({
        method: 'put',
        path: '/custom-objects/{id}/records/{recordId}',
        request: {
            params: CustomObjectRecordParamsSchema,
            body: {
                content: {
                    'application/json': {
                        schema: CustomObjectRecordRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Custom object record updated',
                content: {
                    'application/json': {
                        schema: CustomObjectRecordResponseSchema
                    }
                }
            }
        }
    });

    const deleteCustomObjectRecordRoute = createRoute({
        method: 'delete',
        path: '/custom-objects/{id}/records/{recordId}',
        request: {
            params: CustomObjectRecordParamsSchema
        },
        responses: {
            204: {
                description: 'Custom object record deleted'
            }
        }
    });

    router.openapi(listSettingsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const result = await service.listSettings();
        return context.json(result);
    });

    router.openapi(updateSettingsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.updateSettings(input);
        return context.json(result);
    });

    router.openapi(migrateMetafieldsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.migrateSettingsToMetafields(input);
        return context.json(result);
    });

    router.openapi(rollbackMetafieldsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.rollbackMetafieldMigration(input);
        return context.json(result);
    });

    router.openapi(settingsMigrationRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.registerSettingsMigration(input);
        return context.json(result);
    });

    router.openapi(listCustomObjectsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const result = await service.listCustomObjects();
        return context.json(result);
    });

    router.openapi(createCustomObjectRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const input = context.req.valid('json');
        const result = await service.createCustomObject(input);
        return context.json(result);
    });

    router.openapi(getCustomObjectRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const params = context.req.valid('param');
        const result = await service.getCustomObject(params.id);
        return context.json(result);
    });

    router.openapi(updateCustomObjectRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const params = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await service.updateCustomObject(params.id, input);
        return context.json(result);
    });

    router.openapi(deleteCustomObjectRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const params = context.req.valid('param');
        await service.deleteCustomObject(params.id);
        return context.body(null, 204);
    });

    router.openapi(listCustomObjectRecordsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const params = context.req.valid('param');
        const result = await service.listCustomObjectRecords(params.id);
        return context.json(result);
    });

    router.openapi(createCustomObjectRecordRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const params = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await service.createCustomObjectRecord(params.id, input);
        return context.json(result);
    });

    router.openapi(getCustomObjectRecordRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const params = context.req.valid('param');
        const result = await service.getCustomObjectRecord(params.id, params.recordId);
        return context.json(result);
    });

    router.openapi(updateCustomObjectRecordRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const params = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await service.updateCustomObjectRecord(params.id, params.recordId, input);
        return context.json(result);
    });

    router.openapi(deleteCustomObjectRecordRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin']);
        const params = context.req.valid('param');
        await service.deleteCustomObjectRecord(params.id, params.recordId);
        return context.body(null, 204);
    });

    return router;
};
