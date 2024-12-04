const labsService = require('../../../shared/labs');
const DomainEvents = require('@tryghost/domain-events');
const events = require('../../lib/common/events');
const settingsCache = require('../../../shared/settings-cache');
const members = require('../members');
const {MemberLastSeenAtJobEvent} = require('@tryghost/member-events');
const path = require('path');
const JobManager = require('../jobs');

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

        // Create the last seen at cache and inject it into the last seen at updater
        this.lastSeenAtCache = new LastSeenAtCache({
            services: {
                settingsCache
            }
        });

        // Create the last seen at updater
        this.lastSeenAtUpdater = new LastSeenAtUpdater({
            services: {
                settingsCache
            },
            getMembersApi() {
                return members.api;
            },
            db,
            events,
            lastSeenAtCache: this.lastSeenAtCache,
            DomainEvents
        });

        // Subscribe to domain events
        this.eventStorage.subscribe(DomainEvents);
        this.lastSeenAtUpdater.subscribe(DomainEvents);

        DomainEvents.subscribe(MemberLastSeenAtJobEvent, async function (event) {
            const {memberId, timestamp, timezone} = event.data;
            JobManager.addQueuedJob({
                name: `update-member-last-seen-at-${memberId}`,
                metadata: {
                    job: path.resolve(__dirname, path.join('jobs', 'update-member-last-seen-at')),
                    name: 'update-member-last-seen-at',
                    data: {
                        memberId,
                        timestamp,
                        timezone
                    }
                }
            });
        });
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
