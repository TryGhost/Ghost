import {Hono} from 'hono';
import type {SiteService} from './service.js';
import {SiteUpdateSchema} from './contracts.js';

export const createSiteRouter = (service: SiteService) => {
    const router = new Hono();

    router.get('/', async (context) => {
        const site = await service.getSite();
        return context.json({site});
    });

    router.put('/', async (context) => {
        const body = await context.req.json();
        const input = SiteUpdateSchema.parse(body);
        const site = await service.updateSite(input);
        return context.json({site});
    });

    return router;
};
