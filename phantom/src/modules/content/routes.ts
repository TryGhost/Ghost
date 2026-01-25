import {createRoute} from '@hono/zod-openapi';
import type {ContentService} from './service.js';
import {
    PostCreateRequestBodySchema,
    PostCreateResponseSchema,
    PostIdParamRequestSchema,
    PostResponseSchema,
    TagCreateRequestBodySchema,
    TagCreateResponseSchema
} from './contracts.js';
import {createOpenApiRouter} from '../../platform/http/openapi.js';
import {requireStaffRole} from '../identity/auth.js';
import type {StaffAuthService} from '../identity/service.js';

export const createContentRouter = (service: ContentService, staffAuthService: StaffAuthService) => {
    const router = createOpenApiRouter();

    const createPostRoute = createRoute({
        method: 'post',
        path: '/posts',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: PostCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Post created',
                content: {
                    'application/json': {
                        schema: PostCreateResponseSchema
                    }
                }
            }
        }
    });

    const getPostRoute = createRoute({
        method: 'get',
        path: '/posts/{id}',
        request: {
            params: PostIdParamRequestSchema
        },
        responses: {
            200: {
                description: 'Post details',
                content: {
                    'application/json': {
                        schema: PostResponseSchema
                    }
                }
            }
        }
    });

    const createTagRoute = createRoute({
        method: 'post',
        path: '/tags',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: TagCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Tag created',
                content: {
                    'application/json': {
                        schema: TagCreateResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(createPostRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor', 'author']);
        const input = context.req.valid('json');
        const result = await service.createPost(input);
        return context.json(result);
    });

    router.openapi(getPostRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor', 'author']);
        const params = context.req.valid('param');
        const result = await service.getPost(params.id);
        return context.json(result);
    });

    router.openapi(createTagRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.createTag(input);
        return context.json(result);
    });

    return router;
};
