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
import type {SubscriptionRepository} from '../modules/subscriptions/repo.js';
import type {NewsletterRepository} from '../modules/newsletters/repo.js';
import {createContentApiRouter} from '../modules/compat/content-api.js';
import {createAdminApiRouter} from '../modules/compat/admin-api.js';
import {createMembersApiRouter} from '../modules/compat/members-api.js';
import type {MemberRepository} from '../modules/members/repo.js';
import type {StaffRepository} from '../modules/identity/repo.js';
import {createFrontendRouter} from '../frontend/router.js';
import {createMailSinkRouter} from '../platform/mail/sink-router.js';
import type {MemoryMailbox} from '../platform/mail/memory.js';
import type {FileStore} from '../platform/files/store.js';
import type {ThemeBundleProvider} from '../frontend/themes/bundles.js';

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
    // Test-only: wired by bootstrap when GHOST_E2E_RESET=1.
    e2eReset?: () => Promise<void>;
    mailbox?: MemoryMailbox;
    subscriptionRepository: SubscriptionRepository;
    newsletterRepository: NewsletterRepository;
    memberRepository: MemberRepository;
    staffRepository: StaffRepository;
    fileStore: FileStore;
    themeBundles: ThemeBundleProvider;
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
    contentReader,
    subscriptionRepository,
    newsletterRepository,
    memberRepository,
    staffRepository,
    fileStore,
    themeBundles,
    mailbox,
    e2eReset
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

    // Ghost compat facades own the legacy API paths so existing apps run
    // unmodified (decision #16); the native v10 API lives under /ghost/api/v10.
    const siteUrl = `http://localhost:${config.port}`;
    app.route('/ghost/api/content', createContentApiRouter({
        contentReader,
        settingsService,
        subscriptionRepository,
        newsletterRepository,
        siteUrl
    }));
    app.route('/ghost/api/admin', createAdminApiRouter({
        contentReader,
        contentService,
        settingsService,
        staffAuthService,
        staffRepository,
        subscriptionRepository,
        memberRepository,
        newsletterRepository,
        siteUrl,
        hostSettings: config.hostSettings,
        ...(mailbox ? {mailer: {send: mailbox.provider.send}} : {})
    }));
    app.route('/members/api', createMembersApiRouter({memberAuthService, contentReader, siteUrl}));
    if (e2eReset) {
        app.post('/__e2e__/reset', async (context) => {
            await e2eReset();
            mailbox?.clear();
            return context.json({reset: true});
        });
        // Mailpit-compatible read API over the in-memory mailbox so the
        // vendored email assertions work without an SMTP catcher.
        if (mailbox) {
            app.route('/__mail__', createMailSinkRouter(mailbox));
        }
    }
    app.route('/ghost/api/v10', api);
    app.route('/', createFrontendRouter({
        config,
        contentReader,
        settingsService,
        memberAuthService,
        fileStore,
        themeBundles
    }));

    app.onError(handleError);

    return app;
};
