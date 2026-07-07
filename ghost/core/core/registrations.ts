/**
 * The composition root: every container registration lives here so the whole
 * graph stays greppable in one place. Registration names are API — factories
 * destructure dependencies by these names (see ghost-di-migration-plan.md).
 */

import type {Container, Cradle} from './shared/container/container';
import createConnection from './server/data/db/create-connection';
import createBookshelf from './server/models/base/create-bookshelf';
import createModels from './server/models/create-models';
import createEventRegistry from './server/lib/common/create-event-registry';
import createDomainEvents from './server/lib/common/create-domain-events';
import createSettingsCache from './shared/settings-cache/create';
import {createAdapterManager} from './server/services/adapter-manager';
import createUrlUtils from './shared/create-url-utils';
import createLimitService from './server/services/create-limit-service';
import createTiersService from './server/services/tiers/create';
import createDonationService from './server/services/donations/create';
import createAudienceFeedbackService from './server/services/audience-feedback/create';
import createLinkRedirectsService from './server/services/link-redirection/create';
import createLinkTrackingService from './server/services/link-tracking/create';
import createSlackNotificationsService from './server/services/slack-notifications/create';
import createStaffService from './server/services/staff/create';
import createNewslettersService from './server/services/newsletters/create';
import createMentionsService from './server/services/mentions/create';
import createMilestonesService from './server/services/milestones/create';
import createMembersEventsService from './server/services/members-events/create';
import createCommentsService from './server/services/comments/create';
import createTagsPublicService from './server/services/tags-public/create';
import createPostsPublicService from './server/services/posts-public/create';
import createInvitesService from './server/services/invites/create';
import createSettingsHelpers from './server/services/settings-helpers/create';
import {createConfigView} from './shared/container/config-view';
import createExploreService from './server/services/explore/create';
import createEmailAddressService from './server/services/email-address/create';
import createCustomThemeSettingsService from './server/services/custom-theme-settings/create';
import CustomThemeSettingsCache from './shared/custom-theme-settings-cache/custom-theme-settings-cache';
import createMemberWelcomeEmailService from './server/services/member-welcome-emails/create';
import createEmailSuppressionList from './server/services/email-suppression-list/create';
import createRecommendationsService from './server/services/recommendations/create';
import createMemberAttributionService from './server/services/member-attribution/create';
import createStatsService from './server/services/stats/create';
import createGiftService from './server/services/gifts/create';
import {AutomationsService} from './server/services/automations/service';
import createStripeService from './server/services/stripe/create';
import EmailServiceWrapper from './server/services/email-service/email-service-wrapper';
import ThemeI18n from './frontend/services/theme-engine/i18n/theme-i18n';
import ThemeI18next from './frontend/services/theme-engine/i18next/theme-i18n';
import RouterRegistry from './frontend/services/routing/router-registry';
import RouterManager from './frontend/services/routing/router-manager';
import createUrlService from './server/services/url/create';
import createEngine from './frontend/services/theme-engine/create-engine';

export const registerCoreServices = (container: Container): void => {
    container.register('hbsEngine', {
        lifetime: 'SCOPED',
        factory: ({deploymentConfig}: Cradle) => createEngine({deploymentConfig})
    });

    container.register('activeThemeHolder', {
        lifetime: 'SCOPED',
        factory: () => ({current: undefined})
    });

    container.register('urlService', {
        lifetime: 'SCOPED',
        factory: ({siteConfig, deploymentConfig, models}: Cradle) => createUrlService({siteConfig, deploymentConfig, models})
    });

    container.register('routingRegistry', {
        lifetime: 'SCOPED',
        factory: () => new RouterRegistry()
    });

    container.register('routing', {
        lifetime: 'SCOPED',
        factory: ({routingRegistry}: Cradle) => ({
            routerManager: new RouterManager({registry: routingRegistry}),
            registry: routingRegistry
        })
    });

    container.register('themeI18n', {
        lifetime: 'SCOPED',
        factory: ({siteConfig}: Cradle) => new ThemeI18n({basePath: siteConfig.themesContentPath})
    });

    container.register('themeI18next', {
        lifetime: 'SCOPED',
        factory: ({siteConfig}: Cradle) => new ThemeI18next({basePath: siteConfig.themesContentPath})
    });

    container.register('emailService', {
        lifetime: 'SCOPED',
        factory: ({models, events, settingsCache, settingsHelpers, urlUtils, limits, emailAddress, memberAttribution, linkTracking, audienceFeedback, knex, deploymentConfig, siteConfig}: Cradle) => new EmailServiceWrapper({
            models,
            events,
            settingsCache,
            settingsHelpers,
            urlUtils,
            limits,
            emailAddress,
            memberAttribution,
            linkTracking,
            audienceFeedback,
            knex,
            deploymentConfig,
            siteConfig,
            // Bridged until these migrate
            urlService: require('./server/services/url'),
            jobsService: require('./server/services/jobs'),
            membersService: require('./server/services/members'),
            labs: require('./shared/labs')
        })
    });

    container.register('stripe', {
        lifetime: 'SCOPED',
        factory: ({models, settingsCache, settingsHelpers, urlUtils, events, donations, gifts, staff, deploymentConfig, isTestEnv}: Cradle) => createStripeService({
            models,
            settingsCache,
            settingsHelpers,
            urlUtils,
            events,
            donations,
            gifts,
            staff,
            deploymentConfig,
            isTestEnv,
            // Bridged until these migrate
            labs: require('./shared/labs'),
            membersService: require('./server/services/members')
        })
    });

    container.register('automations', {
        lifetime: 'SCOPED',
        factory: () => new AutomationsService()
    });

    container.register('gifts', {
        lifetime: 'SCOPED',
        factory: ({models, domainEvents, settingsCache, urlUtils, settingsHelpers, tiers, staff}: Cradle) => createGiftService({
            models,
            domainEvents,
            settingsCache,
            urlUtils,
            settingsHelpers,
            tiers,
            staff,
            // Bridged until these migrate
            membersService: require('./server/services/members'),
            t: require('./server/services/i18n').t
        })
    });

    container.register('stats', {
        lifetime: 'SCOPED',
        factory: ({knex, models, siteConfig, adapterManager}: Cradle) => {
            const cacheAdapter = siteConfig.hostSettings?.statsCache?.enabled ? adapterManager.getAdapter('cache:stats') : null;
            return createStatsService({
                knex,
                models,
                cacheAdapter,
                // Bridged until the url service migrates
                urlService: require('./server/services/url')
            });
        }
    });

    container.register('memberAttribution', {
        lifetime: 'SCOPED',
        factory: ({models, urlUtils, settingsCache}: Cradle) => createMemberAttributionService({
            models,
            urlUtils,
            settingsCache,
            // Bridged until the url service migrates
            urlService: require('./server/services/url')
        })
    });

    container.register('recommendations', {
        lifetime: 'SCOPED',
        factory: ({models, domainEvents, urlUtils, siteConfig, deploymentConfig, mentions, staff}: Cradle) => createRecommendationsService({
            models,
            domainEvents,
            urlUtils,
            siteConfig,
            deploymentConfig,
            mentions,
            staff,
            // Bridged until these migrate
            settingsBREADService: require('./server/services/settings').getSettingsBREADServiceInstance(),
            oembedService: require('./server/services/oembed')
        })
    });

    container.register('memberWelcomeEmails', {
        lifetime: 'SCOPED',
        factory: ({models, events, settingsCache}: Cradle) => createMemberWelcomeEmailService({models, events, settingsCache})
    });

    container.register('emailSuppressionList', {
        lifetime: 'SCOPED',
        factory: ({models, settingsCache, siteConfig, deploymentConfig}: Cradle) => createEmailSuppressionList({
            models,
            settingsCache,
            configView: createConfigView({siteConfig, deploymentConfig}),
            // Bridged until labs migrates
            labs: require('./shared/labs')
        })
    });

    container.register('customThemeSettingsCache', {
        lifetime: 'SCOPED',
        factory: () => new CustomThemeSettingsCache()
    });

    container.register('customThemeSettings', {
        lifetime: 'SCOPED',
        factory: ({models, customThemeSettingsCache}: Cradle) => createCustomThemeSettingsService({models, customThemeSettingsCache})
    });

    container.register('emailAddress', {
        lifetime: 'SCOPED',
        factory: ({settingsHelpers, siteConfig, deploymentConfig}: Cradle) => createEmailAddressService({
            settingsHelpers,
            configView: createConfigView({siteConfig, deploymentConfig}),
            // Bridged until labs migrates
            labs: require('./shared/labs')
        })
    });

    container.register('explore', {
        lifetime: 'SCOPED',
        factory: ({models, stats, stripe}: Cradle) => createExploreService({
            models,
            statsService: stats,
            stripeService: stripe,
            // Bridged until these migrate
            membersService: require('./server/services/members'),
            postsService: require('./server/services/posts/posts-service-instance')(),
            publicConfigService: require('./server/services/public-config')
        })
    });

    container.register('tagsPublic', {
        lifetime: 'SCOPED',
        factory: ({events, siteConfig, adapterManager}: Cradle) => {
            const cacheAdapter = siteConfig.hostSettings?.tagsPublicCache?.enabled ? adapterManager.getAdapter('cache:tagsPublic') : null;
            return createTagsPublicService({events, cacheAdapter});
        }
    });

    container.register('postsPublic', {
        lifetime: 'SCOPED',
        factory: ({events, siteConfig, adapterManager}: Cradle) => {
            const cacheAdapter = siteConfig.hostSettings?.postsPublicCache?.enabled ? adapterManager.getAdapter('cache:postsPublic') : null;
            return createPostsPublicService({events, cacheAdapter});
        }
    });

    container.register('settingsHelpers', {
        lifetime: 'SCOPED',
        factory: ({settingsCache, urlUtils, siteConfig, deploymentConfig, limits}: Cradle) => createSettingsHelpers({
            settingsCache,
            urlUtils,
            configView: createConfigView({siteConfig, deploymentConfig}),
            limits,
            // Bridged until labs migrates
            labs: require('./shared/labs')
        })
    });

    container.register('invites', {
        lifetime: 'SCOPED',
        factory: ({settingsCache, settingsHelpers, urlUtils}: Cradle) => createInvitesService({
            settingsCache,
            settingsHelpers,
            urlUtils,
            // Bridged until mail migrates
            mailService: require('./server/services/mail')
        })
    });

    container.register('membersEvents', {
        lifetime: 'SCOPED',
        factory: ({models, domainEvents, events, settingsCache, knex, deploymentConfig}: Cradle) => createMembersEventsService({
            models,
            domainEvents,
            events,
            settingsCache,
            knex,
            deploymentConfig,
            // Bridged until these migrate
            labs: require('./shared/labs'),
            members: require('./server/services/members')
        })
    });

    container.register('comments', {
        lifetime: 'SCOPED',
        factory: ({models, settingsCache, urlUtils, knex}: Cradle) => createCommentsService({
            models,
            settingsCache,
            urlUtils,
            knex,
            // Bridged until these migrate
            urlService: require('./server/services/url'),
            members: require('./server/services/members'),
            settingsHelpers: require('./server/services/settings-helpers'),
            labs: require('./shared/labs')
        })
    });

    container.register('milestones', {
        lifetime: 'SCOPED',
        factory: ({models, domainEvents, knex, settingsCache, getMilestonesConfig}: Cradle) => createMilestonesService({models, domainEvents, knex, settingsCache, getMilestonesConfig})
    });

    container.register('mentions', {
        lifetime: 'SCOPED',
        factory: ({models, events, domainEvents, urlUtils, settingsCache}: Cradle) => createMentionsService({
            models,
            events,
            domainEvents,
            urlUtils,
            settingsCache,
            // Bridged until these migrate
            urlService: require('./server/services/url'),
            jobsService: require('./server/services/mentions-jobs')
        })
    });

    container.register('staff', {
        lifetime: 'SCOPED',
        factory: ({models, domainEvents, settingsCache, urlUtils, memberAttribution, settingsHelpers}: Cradle) => createStaffService({
            models,
            domainEvents,
            settingsCache,
            urlUtils,
            memberAttribution,
            settingsHelpers,
            // Bridged until labs migrates
            labs: require('./shared/labs')
        })
    });

    container.register('newsletters', {
        lifetime: 'SCOPED',
        factory: ({models, urlUtils, limits}: Cradle) => createNewslettersService({
            models,
            urlUtils,
            limits,
            // Bridged until these migrate
            mail: require('./server/services/mail'),
            labs: require('./shared/labs'),
            emailAddressService: require('./server/services/email-address')
        })
    });

    container.register('slackNotifications', {
        lifetime: 'SCOPED',
        factory: ({domainEvents, urlUtils, siteConfig}: Cradle) => createSlackNotificationsService({domainEvents, urlUtils, siteConfig})
    });

    container.register('linkRedirection', {
        lifetime: 'SCOPED',
        factory: ({models, urlUtils, events, siteConfig, adapterManager}: Cradle) => {
            const cacheAdapter = siteConfig.hostSettings?.linkRedirectsPublicCache?.enabled ? adapterManager.getAdapter('cache:linkRedirectsPublic') : null;
            return createLinkRedirectsService({models, urlUtils, events, cacheAdapter});
        }
    });

    container.register('linkTracking', {
        lifetime: 'SCOPED',
        factory: ({models, urlUtils, domainEvents, linkRedirection}: Cradle) => createLinkTrackingService({models, urlUtils, domainEvents, linkRedirection})
    });

    container.register('audienceFeedback', {
        lifetime: 'SCOPED',
        factory: ({models, urlUtils}: Cradle) => createAudienceFeedbackService({
            models,
            urlUtils,
            // Bridged until the url service migrates; required lazily so the container
            // does not drag the whole frontend url subsystem in at import time
            urlService: require('./server/services/url')
        })
    });

    container.register('donations', {
        lifetime: 'SCOPED',
        factory: ({models}: Cradle) => createDonationService({models})
    });

    container.register('tiers', {
        lifetime: 'SCOPED',
        factory: ({models, domainEvents}: Cradle) => createTiersService({models, domainEvents})
    });

    container.register('limits', {
        lifetime: 'SCOPED',
        factory: ({siteConfig, knex}: Cradle) => createLimitService({
            getHostSettings: () => siteConfig.hostSettings,
            db: {knex}
        })
    });

    container.register('urlUtils', {
        lifetime: 'SCOPED',
        factory: ({siteConfig}: Cradle) => createUrlUtils({siteConfig})
    });

    container.register('adapterManager', {
        lifetime: 'SCOPED',
        factory: ({adapterConfig, adapterPaths}: Cradle) => createAdapterManager({config: adapterConfig, pathsToAdapters: adapterPaths})
    });

    container.register('settingsCache', {
        lifetime: 'SCOPED',
        factory: () => createSettingsCache()
    });

    container.register('domainEvents', {
        lifetime: 'SCOPED',
        factory: () => createDomainEvents()
    });

    container.register('events', {
        lifetime: 'SCOPED',
        factory: () => createEventRegistry(),
        dispose: (instance) => {
            (instance as import('events').EventEmitter).removeAllListeners();
        }
    });

    container.register('knex', {
        lifetime: 'SCOPED',
        factory: ({siteConfig}: Cradle) => createConnection(siteConfig.database),
        dispose: instance => (instance as import('knex').Knex).destroy()
    });

    container.register('models', {
        lifetime: 'SCOPED',
        factory: ({knex}: Cradle) => createModels(createBookshelf(knex))
    });
};
