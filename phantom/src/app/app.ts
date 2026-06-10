import {Hono} from 'hono';
import type {AppConfig} from '../platform/config/config.js';
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
import type {NewsletterService} from '../modules/newsletters/service.js';
import {createNewsletterRouter} from '../modules/newsletters/routes.js';
import type {AnalyticsService} from '../modules/analytics/service.js';
import {createAnalyticsRouter} from '../modules/analytics/routes.js';
import type {LinkService} from '../modules/links/service.js';
import {createLinksRouter} from '../modules/links/routes.js';
import type {MediaService} from '../modules/media/service.js';
import {createMediaRouter} from '../modules/media/routes.js';
import type {WebhookService} from '../modules/webhooks/service.js';
import {createWebhookRouter} from '../modules/webhooks/routes.js';
import type {SettingsService} from '../modules/settings/service.js';
import {createSettingsRouter} from '../modules/settings/routes.js';
import type {NotificationService} from '../modules/notifications/service.js';
import {createNotificationRouter} from '../modules/notifications/routes.js';
import type {JobsService} from '../modules/jobs/service.js';
import {createJobsRouter} from '../modules/jobs/routes.js';
import type {OperationsService} from '../modules/operations/service.js';
import {createOperationsRouter} from '../modules/operations/routes.js';
import type {BillingService} from '../modules/billing/service.js';
import {createBillingRouter} from '../modules/billing/routes.js';
import type {ExtensionsService} from '../modules/extensions/service.js';
import {createExtensionsRouter} from '../modules/extensions/routes.js';
import type {CommentService} from '../modules/comments/service.js';
import {createCommentRouter} from '../modules/comments/routes.js';
import type {MetricsClient} from '../platform/metrics/client.js';
import type {FrontendContentReader} from '../modules/content/frontend-reader.js';
import {createFrontendRouter} from '../frontend/router.js';

export type AppDependencies = {
    config: AppConfig;
    siteService: SiteService;
    staffAuthService: StaffAuthService;
    memberAuthService: MemberAuthService;
    partnerService: PartnerService;
    subscriptionService: SubscriptionService;
    contentService: ContentService;
    newsletterService: NewsletterService;
    analyticsService: AnalyticsService;
    linkService: LinkService;
    mediaService: MediaService;
    webhookService: WebhookService;
    settingsService: SettingsService;
    notificationService: NotificationService;
    jobsService: JobsService;
    operationsService: OperationsService;
    billingService: BillingService;
    extensionsService: ExtensionsService;
    commentService: CommentService;
    metricsClient: MetricsClient;
    contentReader: FrontendContentReader;
};

export const createApp = ({
    config,
    siteService,
    staffAuthService,
    memberAuthService,
    partnerService,
    subscriptionService,
    contentService,
    newsletterService,
    analyticsService,
    linkService,
    mediaService,
    webhookService,
    settingsService,
    notificationService,
    jobsService,
    operationsService,
    billingService,
    extensionsService,
    commentService,
    metricsClient,
    contentReader
}: AppDependencies) => {
    const app = new Hono();
    const api = new Hono();

    api.get('/health', (context) => {
        return context.json({status: 'ok'});
    });

    const staffSessionGuard = createStaffSessionGuard(staffAuthService);
    api.use('/site', staffSessionGuard);
    api.use('/site/*', staffSessionGuard);

    api.route('/site', createSiteRouter(siteService));
    api.route('/staff', createIdentityRouter(staffAuthService));
    api.route('/members', createMembersRouter(memberAuthService));
    api.route('/partners', createPartnersRouter(partnerService, staffAuthService));
    api.route('/subscriptions', createSubscriptionsRouter(subscriptionService, staffAuthService));
    api.route('/content', createContentRouter(contentService, staffAuthService));
    api.route('/newsletters', createNewsletterRouter(newsletterService, staffAuthService));
    api.route('/analytics', createAnalyticsRouter(analyticsService));
    api.route('/links', createLinksRouter(linkService, staffAuthService));
    api.route('/media', createMediaRouter(mediaService, staffAuthService));
    api.route('/webhooks', createWebhookRouter(webhookService, staffAuthService));
    api.route('/settings', createSettingsRouter(settingsService, staffAuthService));
    api.route('/notifications', createNotificationRouter(notificationService, staffAuthService));
    api.route('/jobs', createJobsRouter(jobsService, staffAuthService));
    api.route('/operations', createOperationsRouter(operationsService, staffAuthService));
    api.route('/billing', createBillingRouter(billingService, staffAuthService));
    api.route('/extensions', createExtensionsRouter(extensionsService, staffAuthService));
    api.route('/comments', createCommentRouter(commentService, staffAuthService));
    api.get('/metrics', (context) => {
        if (!metricsClient.isEnabled()) {
            return context.text('Metrics disabled', 404);
        }
        return context.text(metricsClient.render(), 200);
    });

    app.route('/ghost/api', api);
    app.route('/', createFrontendRouter({
        config,
        contentReader,
        settingsService
    }));

    app.onError(handleError);

    return app;
};
