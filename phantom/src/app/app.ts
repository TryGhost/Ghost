import {Hono} from 'hono';
import type {SiteService} from '../modules/site/service.js';
import {createSiteRouter} from '../modules/site/routes.js';
import {handleError} from '../platform/http/error-handler.js';
import type {StaffAuthService} from '../modules/identity/service.js';
import {createIdentityRouter} from '../modules/identity/routes.js';
import {createStaffSessionGuard} from '../modules/identity/auth.js';

export type AppDependencies = {
    siteService: SiteService;
    staffAuthService: StaffAuthService;
};

export const createApp = ({siteService, staffAuthService}: AppDependencies) => {
    const app = new Hono();

    app.get('/health', (context) => {
        return context.json({status: 'ok'});
    });

    const staffSessionGuard = createStaffSessionGuard(staffAuthService);
    app.use('/site', staffSessionGuard);
    app.use('/site/*', staffSessionGuard);

    app.route('/site', createSiteRouter(siteService));
    app.route('/staff', createIdentityRouter(staffAuthService));

    app.onError(handleError);

    return app;
};
