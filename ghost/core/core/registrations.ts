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

export const registerCoreServices = (container: Container): void => {
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
