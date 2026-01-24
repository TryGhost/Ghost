import type {Context} from 'hono';
import {SiteUpdateSchema} from '../contracts/site.contracts.js';
import type {SiteService} from '../service/site.service.js';

export type SiteHandlers = {
    getSite: (context: Context) => Promise<Response>;
    updateSite: (context: Context) => Promise<Response>;
};

export const createSiteHandlers = (service: SiteService): SiteHandlers => {
    const getSite = async (context: Context) => {
        const site = await service.getSite();
        return context.json({site});
    };

    const updateSite = async (context: Context) => {
        const body = await context.req.json();
        const input = SiteUpdateSchema.parse(body);
        const site = await service.updateSite(input);
        return context.json({site});
    };

    return {
        getSite,
        updateSite
    };
};
