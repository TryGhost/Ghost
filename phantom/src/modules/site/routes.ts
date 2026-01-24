import {OpenAPIHono, createRoute} from '@hono/zod-openapi';
import type {SiteService} from './service.js';
import {SiteResponseSchema, SiteUpdateRequestSchema, SiteUpdateResponseSchema} from './contracts.js';

const getSiteRoute = createRoute({
    method: 'get',
    path: '/',
    responses: {
        200: {
            description: 'Current site profile',
            content: {
                'application/json': {
                    schema: SiteResponseSchema
                }
            }
        }
    }
});

const updateSiteRoute = createRoute({
    method: 'put',
    path: '/',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: SiteUpdateRequestSchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Updated site profile',
            content: {
                'application/json': {
                    schema: SiteUpdateResponseSchema
                }
            }
        }
    }
});

export const createSiteRouter = (service: SiteService) => {
    const router = new OpenAPIHono();

    router.openapi(getSiteRoute, async (context) => {
        const site = await service.getSite();
        return context.json({site});
    });

    router.openapi(updateSiteRoute, async (context) => {
        const input = context.req.valid('json');
        const site = await service.updateSite(input);
        return context.json({site});
    });

    return router;
};
