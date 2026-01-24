import {Hono} from 'hono';
import type {SiteService} from '../modules/site/service/site.service.js';
import {createSiteRouter} from '../modules/site/routes.js';
import {handleError} from '../platform/http/error-handler.js';

export type AppDependencies = {
    siteService: SiteService;
};

export const createApp = ({siteService}: AppDependencies) => {
    const app = new Hono();

    app.get('/health', (context) => {
        return context.json({status: 'ok'});
    });

    app.route('/site', createSiteRouter(siteService));

    app.onError(handleError);

    return app;
};
