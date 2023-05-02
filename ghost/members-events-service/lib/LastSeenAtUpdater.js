const {MemberPageViewEvent, MemberCommentEvent, MemberLinkClickEvent} = require('@tryghost/member-events');
const moment = require('moment-timezone');
const {IncorrectUsageError} = require('@tryghost/errors');
const {EmailOpenedEvent} = require('@tryghost/email-events');
const logging = require('@tryghost/logging');

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
     */
    constructor({
        services: {
            settingsCache
        },
        getMembersApi,
        db
    }) {
        if (!getMembersApi) {
            throw new IncorrectUsageError({message: 'Missing option getMembersApi'});
        }

        this._getMembersApi = getMembersApi;
        this._settingsCacheService = settingsCache;
        this._db = db;
    }
    /**
     * Subscribe to events of this domainEvents service
     * @param {any} domainEvents The DomainEvents service
     */
    subscribe(domainEvents) {
        domainEvents.subscribe(MemberPageViewEvent, async (event) => {
            try {
                await this.updateLastSeenAt(event.data.memberId, event.data.memberLastSeenAt, event.timestamp);
            } catch (err) {
                logging.error(`Error in LastSeenAtUpdater.MemberPageViewEvent listener for member ${event.data.memberId}`);
                logging.error(err);
            }
        });

        domainEvents.subscribe(MemberLinkClickEvent, async (event) => {
            try {
                await this.updateLastSeenAt(event.data.memberId, event.data.memberLastSeenAt, event.timestamp);
            } catch (err) {
                logging.error(`Error in LastSeenAtUpdater.MemberLinkClickEvent listener for member ${event.data.memberId}`);
                logging.error(err);
            }
        });

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
     * Example: current time is 2022-02-28 18:00:00
     * - memberLastSeenAt is 2022-02-27 23:00:00, timestamp is current time, then `last_seen_at` is set to the current time
     * - memberLastSeenAt is 2022-02-28 01:00:00, timestamp is current time, then `last_seen_at` isn't changed
     * @param {string} memberId The id of the member to be udpated
     * @param {string|null} memberLastSeenAt The previous last_seen_at property value for the current member
     * @param {Date} timestamp The event timestamp
     */
    async updateLastSeenAt(memberId, memberLastSeenAt, timestamp) {
        const timezone = this._settingsCacheService.get('timezone');
        if (memberLastSeenAt === null || moment(moment.utc(timestamp).tz(timezone).startOf('day')).isAfter(memberLastSeenAt)) {
            const membersApi = this._getMembersApi();
            await membersApi.members.update({
                last_seen_at: moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss')
            }, {
                id: memberId
            });
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
