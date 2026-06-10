import {createRoute} from '@hono/zod-openapi';
import type {ContentService} from './service.js';
import {
    PostCreateRequestBodySchema,
    PostCreateResponseSchema,
    PostIdParamRequestSchema,
    PostResponseSchema,
    PostUpdateRequestBodySchema,
    PostUpdateResponseSchema,
    TagCreateRequestBodySchema,
    TagCreateResponseSchema,
    CollectionCreateRequestBodySchema,
    CollectionResponseSchema,
    CollectionListResponseSchema,
    AuthorProfileCreateRequestBodySchema,
    AuthorProfileResponseSchema,
    AuthorProfileListResponseSchema
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

    const updatePostRoute = createRoute({
        method: 'put',
        path: '/posts/{id}',
        request: {
            params: PostIdParamRequestSchema,
            body: {
                content: {
                    'application/json': {
                        schema: PostUpdateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Post updated',
                content: {
                    'application/json': {
                        schema: PostUpdateResponseSchema
                    }
                }
            }
        }
    });

    const deletePostRoute = createRoute({
        method: 'delete',
        path: '/posts/{id}',
        request: {
            params: PostIdParamRequestSchema
        },
        responses: {
            204: {
                description: 'Post deleted'
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

    const createCollectionRoute = createRoute({
        method: 'post',
        path: '/collections',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: CollectionCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Collection created',
                content: {
                    'application/json': {
                        schema: CollectionResponseSchema
                    }
                }
            }
        }
    });

    const listCollectionsRoute = createRoute({
        method: 'get',
        path: '/collections',
        responses: {
            200: {
                description: 'Collections',
                content: {
                    'application/json': {
                        schema: CollectionListResponseSchema
                    }
                }
            }
        }
    });

    const createAuthorRoute = createRoute({
        method: 'post',
        path: '/authors',
        request: {
            body: {
                content: {
                    'application/json': {
                        schema: AuthorProfileCreateRequestBodySchema
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Author created',
                content: {
                    'application/json': {
                        schema: AuthorProfileResponseSchema
                    }
                }
            }
        }
    });

    const listAuthorsRoute = createRoute({
        method: 'get',
        path: '/authors',
        responses: {
            200: {
                description: 'Authors',
                content: {
                    'application/json': {
                        schema: AuthorProfileListResponseSchema
                    }
                }
            }
        }
    });

    router.openapi(createPostRoute, async (context) => {
        const staff = await requireStaffRole(context, staffAuthService, ['admin', 'editor', 'author']);
        const input = context.req.valid('json');
        const result = await service.createPost(input, staff.id);
        return context.json(result);
    });

    router.openapi(getPostRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor', 'author']);
        const params = context.req.valid('param');
        const result = await service.getPost(params.id);
        return context.json(result);
    });

    router.openapi(updatePostRoute, async (context) => {
        const staff = await requireStaffRole(context, staffAuthService, ['admin', 'editor', 'author']);
        const params = context.req.valid('param');
        const input = context.req.valid('json');
        const result = await service.updatePost(params.id, input, staff.id);
        return context.json(result);
    });

    router.openapi(deletePostRoute, async (context) => {
        const staff = await requireStaffRole(context, staffAuthService, ['admin', 'editor', 'author']);
        const params = context.req.valid('param');
        await service.deletePost(params.id, staff.id);
        return context.body(null, 204);
    });

    router.openapi(createTagRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.createTag(input);
        return context.json(result);
    });

    router.openapi(createCollectionRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.createCollection(input);
        return context.json(result);
    });

    router.openapi(listCollectionsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor', 'author']);
        const result = await service.listCollections();
        return context.json(result);
    });

    router.openapi(createAuthorRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor']);
        const input = context.req.valid('json');
        const result = await service.createAuthorProfile(input);
        return context.json(result);
    });

    router.openapi(listAuthorsRoute, async (context) => {
        await requireStaffRole(context, staffAuthService, ['admin', 'editor', 'author']);
        const result = await service.listAuthorProfiles();
        return context.json(result);
    });

    return router;
};
