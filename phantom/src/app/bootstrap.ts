import {createDb} from '../db/client.js';
import {loadConfig} from '../platform/config/config.js';
import {createSiteRepository} from '../modules/site/repo.js';
import {createSiteService} from '../modules/site/service.js';
import {createStaffRepository} from '../modules/identity/repo.js';
import {createStaffAuthService} from '../modules/identity/service.js';
import {createMemberRepository} from '../modules/members/repo.js';
import {createMemberAuthService} from '../modules/members/service.js';
import {createPartnerRepository} from '../modules/partners/repo.js';
import {createPartnerService} from '../modules/partners/service.js';
import {createSubscriptionRepository} from '../modules/subscriptions/repo.js';
import {createSubscriptionService} from '../modules/subscriptions/service.js';
import {createContentRepository} from '../modules/content/repo.js';
import {createContentService} from '../modules/content/service.js';
import {createFrontendContentReader} from '../modules/content/frontend-reader.js';
import {createNewsletterRepository} from '../modules/newsletters/repo.js';
import {createNewsletterService} from '../modules/newsletters/service.js';
import {createAnalyticsRepository} from '../modules/analytics/repo.js';
import {createAnalyticsService} from '../modules/analytics/service.js';
import {createLinkRepository} from '../modules/links/repo.js';
import {createLinkService} from '../modules/links/service.js';
import {createMediaRepository} from '../modules/media/repo.js';
import {createMediaService} from '../modules/media/service.js';
import {createWebhookRepository} from '../modules/webhooks/repo.js';
import {createWebhookService} from '../modules/webhooks/service.js';
import {createSettingsRepository} from '../modules/settings/repo.js';
import {createSettingsService} from '../modules/settings/service.js';
import {createNotificationRepository} from '../modules/notifications/repo.js';
import {createNotificationService} from '../modules/notifications/service.js';
import {createJobsRepository} from '../modules/jobs/repo.js';
import {createJobsService} from '../modules/jobs/service.js';
import {createInMemoryQueueProvider} from '../modules/jobs/queue.js';
import {createOperationsRepository} from '../modules/operations/repo.js';
import {createOperationsService} from '../modules/operations/service.js';
import {createGhostImporter} from '../modules/operations/importer.js';
import {ensureCoreSchema} from '../db/ddl.js';
import {createBillingRepository} from '../modules/billing/repo.js';
import {createBillingService} from '../modules/billing/service.js';
import {createExtensionsRepository} from '../modules/extensions/repo.js';
import {createExtensionsService} from '../modules/extensions/service.js';
import {createCommentRepository} from '../modules/comments/repo.js';
import {createCommentService} from '../modules/comments/service.js';
import {getMetricsClient} from '../platform/metrics/client.js';
import {createMemoryMailbox} from '../platform/mail/memory.js';
import {renderLexicalHtml} from '../frontend/rendering/lexical.js';
import type {FileStore} from '../platform/files/store.js';
import type {ThemeBundleProvider} from '../frontend/themes/bundles.js';

// Platform-specific pieces (static files, theme bundles) default to the Node
// implementations via lazy imports so the Workers entry point can inject its
// own without pulling node:fs into the bundle's startup path.
export type PlatformOverrides = {
    fileStore?: FileStore;
    themeBundles?: ThemeBundleProvider;
};

export const createAppDependencies = async (platform: PlatformOverrides = {}) => {
    const config = loadConfig();
    const db = createDb(config.db);
    const fileStore = platform.fileStore
        ?? (await import('../platform/files/node.js')).createNodeFileStore({themesRoot: config.themes.fs.root});
    const themeBundles = platform.themeBundles
        ?? (await import('../frontend/themes/node-bundles.js')).createNodeThemeBundles(config);
    // Remote libSQL can't span a manual transaction across statements; the
    // importer falls back to non-atomic statement-by-statement writes there.
    const atomicImport = !/^(https?|libsql|wss?):/.test(config.db.url);
    await ensureCoreSchema(db);
    const siteRepository = createSiteRepository(db);
    const siteService = createSiteService(siteRepository);
    const staffRepository = createStaffRepository(db);
    const staffAuthService = createStaffAuthService(staffRepository, {
        ssoProviders: config.identity.ssoProviders,
        deviceVerification: config.security.staffDeviceVerification
    });
    const memberRepository = createMemberRepository(db);
    const partnerRepository = createPartnerRepository(db);
    const partnerService = createPartnerService(partnerRepository, staffRepository);
    const subscriptionRepository = createSubscriptionRepository(db);
    const subscriptionService = createSubscriptionService(subscriptionRepository, memberRepository);
    const contentRepository = createContentRepository(db);
    const contentService = createContentService(contentRepository);
    const contentReader = createFrontendContentReader(contentRepository);
    const newsletterRepository = createNewsletterRepository(db);
    const newsletterService = createNewsletterService(newsletterRepository);
    const analyticsRepository = createAnalyticsRepository(db);
    const analyticsService = createAnalyticsService(analyticsRepository);
    const metricsClient = getMetricsClient();
    const mailbox = createMemoryMailbox();
    const siteUrl = `http://localhost:${config.port}`;
    const siteTitle = async () => {
        const {settings} = await settingsService.listSettings();
        const title = settings.find((setting) => setting.key === 'site.title')?.value;
        return typeof title === 'string' ? title : 'Ghost';
    };
    const memberAuthService = createMemberAuthService(
        memberRepository,
        config.memberAuth.signupPolicy,
        analyticsRepository,
        {
            send: mailbox.provider.send,
            siteUrl,
            // Resolved per send, after settingsService below is initialized.
            siteTitle,
            // Welcome email: the active free template goes out as soon as a
            // new member completes signup.
            onMemberCreated: async (member) => {
                const template = await newsletterRepository.getAutomatedEmailDefinitionBySlug('member-welcome-email-free');
                if (!template || template.status !== 'active') {
                    return;
                }
                let html = '';
                if (template.lexical) {
                    try {
                        html = await renderLexicalHtml(JSON.parse(template.lexical) as Record<string, unknown>);
                    } catch {
                        html = '';
                    }
                }
                const title = await siteTitle();
                // Personalization tokens: {first_name} falls back to 'there'.
                const firstName = member.name?.trim().split(/\s+/)[0] || 'there';
                const subject = template.subject.replaceAll('{first_name}', firstName);
                await mailbox.provider.send({
                    to: member.email,
                    from: template.senderEmail ?? `noreply@${new URL(siteUrl).hostname}`,
                    fromName: template.senderName ?? title,
                    subject,
                    text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
                    html: `<!DOCTYPE html><html><body>${html}</body></html>`
                });
            }
        }
    );
    const linkRepository = createLinkRepository(db);
    const linkService = createLinkService(linkRepository, analyticsRepository);
    const mediaRepository = createMediaRepository(db);
    const mediaService = createMediaService(mediaRepository);
    const webhookRepository = createWebhookRepository(db);
    const webhookService = createWebhookService(webhookRepository);
    const settingsRepository = createSettingsRepository(db);
    const settingsService = createSettingsService(settingsRepository);
    const notificationRepository = createNotificationRepository(db);
    const notificationService = createNotificationService(notificationRepository);
    const jobsRepository = createJobsRepository(db);
    const queueProvider = config.queue.provider === 'memory'
        ? createInMemoryQueueProvider()
        : createInMemoryQueueProvider();
    const jobsService = createJobsService(jobsRepository, queueProvider, metricsClient);
    const operationsRepository = createOperationsRepository(db);
    const operationsService = createOperationsService(
        operationsRepository,
        newsletterRepository,
        staffRepository,
        memberRepository,
        contentRepository,
        webhookRepository,
        analyticsRepository,
        metricsClient,
        createGhostImporter(db, {atomic: atomicImport})
    );
    const billingRepository = createBillingRepository(db);
    const billingService = createBillingService(billingRepository);
    const extensionsRepository = createExtensionsRepository(db);
    const extensionsService = createExtensionsService(extensionsRepository, billingRepository);
    const commentRepository = createCommentRepository(db);
    const commentService = createCommentService(
        commentRepository,
        memberRepository,
        settingsRepository,
        analyticsRepository
    );

    // Test-only reset endpoint; lazy so the fixture reader (node:fs) stays
    // out of runtimes that never set the flag.
    const e2eReset = process.env.GHOST_E2E_RESET === '1'
        ? await (async () => {
            const [{createE2eReset}, {resolve: resolvePath}] = await Promise.all([
                import('../modules/operations/e2e-seed.js'),
                import('node:path')
            ]);
            return createE2eReset(db, resolvePath(process.cwd(), 'test', 'fixtures', 'ghost-v5-export.json'), {atomic: atomicImport});
        })()
        : undefined;

    return {
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
        ...(e2eReset ? {e2eReset} : {})
    };
};
