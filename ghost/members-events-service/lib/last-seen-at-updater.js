const {MemberPageViewEvent, MemberCommentEvent, MemberLinkClickEvent} = require('@tryghost/member-events');
const moment = require('moment-timezone');
const {IncorrectUsageError} = require('@tryghost/errors');

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
     */
    constructor({
        services: {
            settingsCache
        },
        getMembersApi
    }) {
        if (!getMembersApi) {
            throw new IncorrectUsageError({message: 'Missing option getMembersApi'});
        }

        this._getMembersApi = getMembersApi;
        this._settingsCacheService = settingsCache;
    }
    /**
     * Subscribe to events of this domainEvents service
     * @param {any} domainEvents The DomainEvents service
     */
    subscribe(domainEvents) {
        domainEvents.subscribe(MemberPageViewEvent, async (event) => {
            await this.updateLastSeenAt(event.data.memberId, event.data.memberLastSeenAt, event.timestamp);
        });

        domainEvents.subscribe(MemberLinkClickEvent, async (event) => {
            await this.updateLastSeenAt(event.data.memberId, event.data.memberLastSeenAt, event.timestamp);
        });

        domainEvents.subscribe(MemberCommentEvent, async (event) => {
            await this.updateLastCommentedAt(event.data.memberId, event.timestamp);
        });
    }

    /**
     * Updates the member.last_seen_at field if it wasn't updated in the current day yet (in the publication timezone)
     * Example: current time is 2022-02-28 18:00:00
     * - memberLastSeenAt is 2022-02-27 23:00:00, timestamp is current time, then `last_seen_at` is set to the current time
     * - memberLastSeenAt is 2022-02-28 01:00:00, timestamp is current time, then `last_seen_at` isn't changed
     * @param {string} memberId The id of the member to be udpated
     * @param {string} memberLastSeenAt The previous last_seen_at property value for the current member
     * @param {Date} timestamp The event timestamp
     */
    async updateLastSeenAt(memberId, memberLastSeenAt, timestamp) {
        const timezone = this._settingsCacheService.get('timezone');
        if (memberLastSeenAt === null || moment(moment.utc(timestamp).tz(timezone).startOf('day')).isAfter(memberLastSeenAt)) {
            const membersApi = await this._getMembersApi();
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
        const membersApi = await this._getMembersApi();
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
