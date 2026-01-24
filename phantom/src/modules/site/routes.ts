import {Hono} from 'hono';
import {createSiteHandlers} from './handlers/site.handlers.js';
import type {SiteService} from './service/site.service.js';

export const createSiteRouter = (service: SiteService) => {
    const router = new Hono();
    const handlers = createSiteHandlers(service);

    router.get('/', handlers.getSite);
    router.put('/', handlers.updateSite);

    return router;
};
