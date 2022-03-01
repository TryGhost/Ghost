const {MemberPageViewEvent} = require('@tryghost/member-events');
const moment = require('moment-timezone');

/**
 * Listen for `MemberViewEvent` to update the `member.last_seen_at` timestamp
 */
class LastSeenAtUpdater {
    /**
     * Initializes the event subscriber
     * @param {Object} deps dependencies
     * @param {Object} deps.models The list of model dependencies
     * @param {any} deps.models.Member The Member model
     * @param {Object} deps.services The list of service dependencies
     * @param {any} deps.services.domainEvents The DomainEvents service
     * @param {any} deps.services.settingsCache The settings service
     */
    constructor({
        models: {
            Member
        },
        services: {
            domainEvents,
            settingsCache
        }
    }) {
        this._memberModel = Member;
        this._domainEventsService = domainEvents;
        this._settingsCacheService = settingsCache;

        this._domainEventsService.subscribe(MemberPageViewEvent, async (event) => {
            await this.updateLastSeenAt(event.data.memberId, event.data.memberLastSeenAt, event.timestamp);
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
            await this._memberModel.edit({
                last_seen_at: moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss')
            }, {
                id: memberId
            });
        }
    }
}

module.exports = LastSeenAtUpdater;
