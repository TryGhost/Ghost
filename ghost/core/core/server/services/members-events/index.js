const labsService = require('../../../shared/labs');
const DomainEvents = require('@tryghost/domain-events');
const events = require('../../lib/common/events');
const settingsCache = require('../../../shared/settings-cache');
const members = require('../members');

class MembersEventsServiceWrapper {
    init() {
        if (this.eventStorage) {
            // Prevent creating duplicate DomainEvents subscribers
            return;
        }

        // Wire up all the dependencies
        const {EventStorage, LastSeenAtUpdater, LastSeenAtCache} = require('@tryghost/members-events-service');
        const models = require('../../models');

        // Listen for events and store them in the database
        this.eventStorage = new EventStorage({
            models: {
                MemberCreatedEvent: models.MemberCreatedEvent,
                SubscriptionCreatedEvent: models.SubscriptionCreatedEvent
            },
            labsService
        });

        const db = require('../../data/db');

        this.lastSeenAtCache = new LastSeenAtCache({
            settingsCache
        });

        this.lastSeenAtUpdater = new LastSeenAtUpdater({
            services: {
                settingsCache
            },
            getMembersApi() {
                return members.api;
            },
            db,
            events,
            lastSeenAtCache: this.lastSeenAtCache
        });

        this.eventStorage.subscribe(DomainEvents);
        this.lastSeenAtUpdater.subscribe(DomainEvents);
    }

    // Clear the last seen at cache
    // Utility used for testing purposes
    clearLastSeenAtCache() {
        if (this.lastSeenAtCache) {
            this.lastSeenAtCache.clear();
        }
    }
}

module.exports = new MembersEventsServiceWrapper();
