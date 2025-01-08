const {MemberPageViewEvent, MemberCommentEvent, MemberLinkClickEvent} = require('@tryghost/member-events');
const moment = require('moment-timezone');
const {IncorrectUsageError} = require('@tryghost/errors');
const {EmailOpenedEvent} = require('@tryghost/email-events');
const logging = require('@tryghost/logging');
const LastSeenAtCache = require('./LastSeenAtCache');

/**
 * Listen for `MemberViewEvent` to update the `member.last_seen_at` timestamp
 */
class LastSeenAtUpdater {
    /**
     * Initializes the event subscriber
     * @param {Object} deps dependencies
     * @param {Object} deps.services The list of service dependencies
     * @param {any} deps.services.settingsCache The settings service
     * @param {() => object} deps.getMembersApi - A function which returns an instance of members-api
     * @param {any} deps.db Database connection
     * @param {any} deps.events The event emitter
     * @param {any} deps.lastSeenAtCache An instance of the last seen at cache
     * @param {any} deps.config Ghost config for click tracking
     */
    constructor({
        services: {
            settingsCache
        },
        getMembersApi,
        db,
        events,
        lastSeenAtCache,
        config
    }) {
        if (!getMembersApi) {
            throw new IncorrectUsageError({message: 'Missing option getMembersApi'});
        }

        this._getMembersApi = getMembersApi;
        this._settingsCacheService = settingsCache;
        this._db = db;
        this._events = events;
        this._lastSeenAtCache = lastSeenAtCache || new LastSeenAtCache({services: {settingsCache}});
        this._config = config;
    }
    /**
     * Subscribe to events of this domainEvents service
     * @param {any} domainEvents The DomainEvents service
     */
    subscribe(domainEvents) {
        domainEvents.subscribe(MemberPageViewEvent, async (event) => {
            try {
                await this.cachedUpdateLastSeenAt(event.data.memberId, event.data.memberLastSeenAt, event.timestamp);
            } catch (err) {
                logging.error(`Error in LastSeenAtUpdater.MemberPageViewEvent listener for member ${event.data.memberId}`);
                logging.error(err);
            }
        });

        // Only disable if explicitly set to false in config
        const shouldUpdateForClickTracking = !this._config || this._config.get('backgroundJobs:clickTrackingLastSeenAtUpdater') !== false;
        if (shouldUpdateForClickTracking) {
            domainEvents.subscribe(MemberLinkClickEvent, async (event) => {
                try {
                    await this.cachedUpdateLastSeenAt(event.data.memberId, event.data.memberLastSeenAt, event.timestamp);
                } catch (err) {
                    logging.error(`Error in LastSeenAtUpdater.MemberLinkClickEvent listener for member ${event.data.memberId}`);
                    logging.error(err);
                }
            });
        }

        domainEvents.subscribe(MemberCommentEvent, async (event) => {
            try {
                await this.updateLastCommentedAt(event.data.memberId, event.timestamp);
            } catch (err) {
                logging.error(`Error in LastSeenAtUpdater.MemberCommentEvent listener for member ${event.data.memberId}`);
                logging.error(err);
            }
        });

        domainEvents.subscribe(EmailOpenedEvent, async (event) => {
            try {
                await this.updateLastSeenAtWithoutKnownLastSeen(event.memberId, event.timestamp);
            } catch (err) {
                logging.error(`Error in LastSeenAtUpdater.EmailOpenedEvent listener for member ${event.memberId}, emailRecipientId ${event.emailRecipientId}`);
                logging.error(err);
            }
        });
    }

    /**
     * Updates the member.last_seen_at field if it wasn't updated in the current day yet (in the publication timezone)
     * Example: current time is 2022-02-28 18:00:00
     * - memberLastSeenAt is 2022-02-27 23:00:00, timestamp is current time, then `last_seen_at` is set to the current time
     * - memberLastSeenAt is 2022-02-28 01:00:00, timestamp is current time, then `last_seen_at` isn't changed
     * @param {string} memberId The id of the member to be udpated
     * @param {Date} timestamp The event timestamp
     */
    async updateLastSeenAtWithoutKnownLastSeen(memberId, timestamp) {
        // Note: we are not using Bookshelf / member repository to prevent firing webhooks + to prevent deadlock issues
        // If we would use the member repostiory, we would create a forUpdate lock when editing the member, including when fetching the member labels. Creating a possible deadlock if somewhere else we do the reverse in a transaction.
        const timezone = this._settingsCacheService.get('timezone') || 'Etc/UTC';
        const startOfDayInSiteTimezone = moment.utc(timestamp).tz(timezone).startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
        const formattedTimestamp = moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss');
        await this._db.knex('members')
            .where('id', '=', memberId)
            .andWhere(builder => builder
                .where('last_seen_at', '<', startOfDayInSiteTimezone)
                .orWhereNull('last_seen_at')
            )
            .update({
                last_seen_at: formattedTimestamp
            });
    }

    /**
     * Updates the member.last_seen_at field if it wasn't updated in the current day yet (in the publication timezone)
     */
    async cachedUpdateLastSeenAt(memberId, memberLastSeenAt, timestamp) {
        if (this._lastSeenAtCache.shouldUpdateMember(memberId)) {
            await this.updateLastSeenAt(memberId, memberLastSeenAt, timestamp);
        }
    }

    /**
     * Updates the member.last_seen_at field if it wasn't updated in the current day yet (in the publication timezone)
     * Example: current time is 2022-02-28 18:00:00
     * - memberLastSeenAt is 2022-02-27 23:00:00, timestamp is current time, then `last_seen_at` is set to the current time
     * - memberLastSeenAt is 2022-02-28 01:00:00, timestamp is current time, then `last_seen_at` isn't changed
     * @param {string} memberId The id of the member to be udpated
     * @param {Date} timestamp The event timestamp
     */
    async updateLastSeenAt(memberId, memberLastSeenAt, timestamp) {
        const timezone = this._settingsCacheService.get('timezone');
        // First, check if memberLastSeenAt is null or before the beginning of the current day in the publication timezone
        // This isn't strictly necessary since we will fetch the member row for update and double check this
        // This is an optimization to avoid unnecessary database queries if last_seen_at is already after the beginning of the current day
        if (memberLastSeenAt === null || moment(moment.utc(timestamp).tz(timezone).startOf('day')).isAfter(memberLastSeenAt)) {
            try {
                // Pre-emptively update local cache so we don't update the same member again in the same day
                this._lastSeenAtCache.add(memberId);
                const membersApi = this._getMembersApi();
                await this._db.knex.transaction(async (trx) => {
                    // To avoid a race condition, we lock the member row for update, then the last_seen_at field again to prevent simultaneous updates
                    const currentMember = await membersApi.members.get({id: memberId}, {require: true, transacting: trx, forUpdate: true});
                    const currentMemberLastSeenAt = currentMember.get('last_seen_at');
                    if (currentMemberLastSeenAt === null || moment(moment.utc(timestamp).tz(timezone).startOf('day')).isAfter(currentMemberLastSeenAt)) {
                        const memberToUpdate = await currentMember.refresh({transacting: trx, forUpdate: false, withRelated: ['labels', 'newsletters']});
                        const updatedMember = await memberToUpdate.save({last_seen_at: moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss')}, {transacting: trx, patch: true, method: 'update'});
                        // The standard event doesn't get emitted inside the transaction, so we do it manually
                        this._events.emit('member.edited', updatedMember);
                        return Promise.resolve(updatedMember);
                    }
                    return Promise.resolve(undefined);
                });
            } catch (err) {
                // Remove the member from the cache if an error occurs
                // This is to ensure that the member is updated on the next event if this one fails
                this._lastSeenAtCache.remove(memberId);
                // Bubble up the error to the event listener
                throw err;
            }
        }
    }

    /**
     * Updates the member.last_seen_at field if it wasn't updated in the current day yet (in the publication timezone)
     * Example: current time is 2022-02-28 18:00:00
     * - memberLastSeenAt is 2022-02-27 23:00:00, timestamp is current time, then `last_seen_at` is set to the current time
     * - memberLastSeenAt is 2022-02-28 01:00:00, timestamp is current time, then `last_seen_at` isn't changed
     * @param {string} memberId The id of the member to be udpated
     * @param {Date} timestamp The event timestamp
     */
    async updateLastCommentedAt(memberId, timestamp) {
        const membersApi = this._getMembersApi();
        const member = await membersApi.members.get({id: memberId}, {require: true});
        const timezone = this._settingsCacheService.get('timezone');

        const memberLastSeenAt = member.get('last_seen_at');
        const memberLastCommentedAt = member.get('last_commented_at');

        if (memberLastSeenAt === null || moment(moment.utc(timestamp).tz(timezone).startOf('day')).isAfter(memberLastSeenAt) || memberLastCommentedAt === null || moment(moment.utc(timestamp).tz(timezone).startOf('day')).isAfter(memberLastCommentedAt)) {
            await membersApi.members.update({
                last_seen_at: moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss'),
                last_commented_at: moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss')
            }, {
                id: memberId
            });
        }
    }
}

module.exports = LastSeenAtUpdater;
