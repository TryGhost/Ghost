const EventStorage = require('./event-storage');
const LastSeenAtUpdater = require('./last-seen-at-updater');
const LastSeenAtCache = require('./last-seen-at-cache');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.domainEvents
 * @param {object} deps.events
 * @param {object} deps.settingsCache
 * @param {import('knex').Knex} deps.knex
 * @param {object} deps.labs
 * @param {object} deps.members
 * @param {{get: (key: string) => unknown}} deps.deploymentConfig
 */
module.exports = function createMembersEventsService({models, domainEvents, events, settingsCache, knex, labs, members, deploymentConfig}) {
    const eventStorage = new EventStorage({
        models: {
            MemberCreatedEvent: models.MemberCreatedEvent,
            SubscriptionCreatedEvent: models.SubscriptionCreatedEvent
        },
        labsService: labs
    });

    const lastSeenAtCache = new LastSeenAtCache({
        services: {
            settingsCache
        }
    });

    const lastSeenAtUpdater = new LastSeenAtUpdater({
        services: {
            settingsCache
        },
        getMembersApi() {
            return members.api;
        },
        db: {knex},
        events,
        lastSeenAtCache,
        config: deploymentConfig
    });

    let initialized = false;

    return {
        eventStorage,
        lastSeenAtCache,
        lastSeenAtUpdater,
        init() {
            if (initialized) {
                // Prevent creating duplicate DomainEvents subscribers
                return;
            }
            initialized = true;
            eventStorage.subscribe(domainEvents);
            lastSeenAtUpdater.subscribe(domainEvents);
        },
        clearLastSeenAtCache() {
            lastSeenAtCache.clear();
        }
    };
};
