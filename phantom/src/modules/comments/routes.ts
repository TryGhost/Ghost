import type {CommentService} from './service.js';
import {
    CommentCreateRequestSchema,
    CommentDeleteRequestSchema,
    CommentDeleteResponseSchema,
    CommentListRequestSchema,
    CommentListResponseSchema,
    CommentModerateRequestSchema,
    CommentResponseSchema,
    CommentUpdateRequestSchema,
    CommentIdParamSchema
} from './contracts.js';
import {createRoute} from '@hono/zod-openapi';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import {requireStaffRole} from '../identity/auth.js';
import type {StaffAuthService} from '../identity/service.js';

export const createCommentRouter = (service: CommentService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const createRouteConfig = createRoute({
        method: 'post',
        path: '/',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: CommentCreateRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Comment created',
                content: {
                    'application/json': {
                        schema: CommentResponseSchema
                    }
                }
            }
        }
    });

    const listRoute = createRoute({
        method: 'get',
        path: '/',
        request: {
            query: CommentListRequestSchema
        },
        responses: {
            200: {
                description: 'Comments listed',
                content: {
                    'application/json': {
                        schema: CommentListResponseSchema
                    }
                }
            }
        }
    });

    const updateRoute = createRoute({
        method: 'put',
        path: '/{id}',
        request: {
            params: CommentIdParamSchema,
            body: {
                content: {
                    'application/json': {
                        schema: CommentUpdateRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Comment updated',
                content: {
                    'application/json': {
                        schema: CommentResponseSchema
                    }
                }
            }
        }
    });

    const moderateRoute = createRoute({
        method: 'put',
        path: '/{id}/moderate',
        request: {
            params: CommentIdParamSchema,
            body: {
                content: {
                    'application/json': {
                        schema: CommentModerateRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Comment moderated',
                content: {
                    'application/json': {
                        schema: CommentResponseSchema
                    }
                }
            }
        }
    });

    const deleteRoute = createRoute({
        method: 'delete',
        path: '/{id}',
        request: {
            params: CommentIdParamSchema,
            body: {
                content: {
                    'application/json': {
                        schema: CommentDeleteRequestSchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Comment deleted',
                content: {
                    'application/json': {
                        schema: CommentDeleteResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(createRouteConfig, async (context) => {
        const input = context.req.valid('json');
        const result = await service.createComment(input);
        return context.json(result);
    });

    router.openapi(listRoute, async (context) => {
        const input = context.req.valid('query');
        const result = await service.listComments(input);
        return context.json(result);
    });

    router.openapi(updateRoute, async (context) => {
        const params = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await service.updateComment(params.id, input);
        return context.json(result);
    });

    router.openapi(moderateRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const params = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await service.moderateComment(params.id, input);
        return context.json(result);
    });

    router.openapi(deleteRoute, async (context) => {
        const params = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await service.deleteComment(params.id, input);
        return context.json(result);
    });

    return router;
};
