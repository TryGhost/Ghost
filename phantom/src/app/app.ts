import {Hono} from 'hono';
import type {SiteService} from '../modules/site/service.js';
import {createSiteRouter} from '../modules/site/routes.js';
import {handleError} from '../platform/http/error-handler.js';
import type {StaffAuthService} from '../modules/identity/service.js';
import {createIdentityRouter} from '../modules/identity/routes.js';
import {createStaffSessionGuard} from '../modules/identity/auth.js';
import type {MemberAuthService} from '../modules/members/service.js';
import {createMembersRouter} from '../modules/members/routes.js';
import type {PartnerService} from '../modules/partners/service.js';
import {createPartnersRouter} from '../modules/partners/routes.js';
import type {SubscriptionService} from '../modules/subscriptions/service.js';
import {createSubscriptionsRouter} from '../modules/subscriptions/routes.js';
import type {ContentService} from '../modules/content/service.js';
import {createContentRouter} from '../modules/content/routes.js';

export type AppDependencies = {
    siteService: SiteService;
    staffAuthService: StaffAuthService;
    memberAuthService: MemberAuthService;
    partnerService: PartnerService;
    subscriptionService: SubscriptionService;
    contentService: ContentService;
};

export const createApp = ({
    siteService,
    staffAuthService,
    memberAuthService,
    partnerService,
    subscriptionService,
    contentService
}: AppDependencies) => {
    const app = new Hono();

    app.get('/health', (context) => {
        return context.json({status: 'ok'});
    });

    const staffSessionGuard = createStaffSessionGuard(staffAuthService);
    app.use('/site', staffSessionGuard);
    app.use('/site/*', staffSessionGuard);

    app.route('/site', createSiteRouter(siteService));
    app.route('/staff', createIdentityRouter(staffAuthService));
    app.route('/members', createMembersRouter(memberAuthService));
    app.route('/partners', createPartnersRouter(partnerService, staffAuthService));
    app.route('/subscriptions', createSubscriptionsRouter(subscriptionService, staffAuthService));
    app.route('/content', createContentRouter(contentService, staffAuthService));

    app.onError(handleError);

    return app;
};
