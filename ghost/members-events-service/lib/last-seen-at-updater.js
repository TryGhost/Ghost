const DomainEvents = require('@tryghost/domain-events');
const {MemberPageViewEvent} = require('@tryghost/member-events');
const moment = require('moment');

/**
 * Listen for `MemberViewEvent` to update the `member.last_seen_at` timestamp
 */
class LastSeenAtUpdater {
    /**
     * Initializes the event subscriber
     * @param {Object} deps dependencies
     * @param {any} deps.memberModel The member model
     */
    constructor({memberModel}) {
        this._memberModel = memberModel;
        DomainEvents.subscribe(MemberPageViewEvent, async (event) => {
            await this.updateLastSeenAt(event.data.memberId, event.data.memberLastSeenAt, event.timestamp);
        });
    }

    /**
     * Updates the member.last_seen_at field if it wasn't updated in the current UTC day yet
     * Example: current time is 2022-02-28 18:00:00 UTC
     * - memberLastSeenAt is 2022-02-27 23:00:00 UTC, timestamp is current time, then `last_seen_at` is set to the current time
     * - memberLastSeenAt is 2022-02-28 01:00:00 UTC, timestamp is current time, then `last_seen_at` isn't changed
     * @param {string} memberId The id of the member to be udpated
     * @param {string} memberLastSeenAt The previous last_seen_at property value for the current member
     * @param {Date} timestamp The event timestamp
     */
    async updateLastSeenAt(memberId, memberLastSeenAt, timestamp) {
        if (memberLastSeenAt === null || moment(moment.utc(timestamp).startOf('day')).isAfter(moment.utc(memberLastSeenAt).startOf('day'))) {
            await this._memberModel.update({
                last_seen_at: moment.utc(timestamp).format('YYYY-MM-DD HH:mm:ss')
            }, {
                id: memberId
            });
        }
    }
}

module.exports = LastSeenAtUpdater;
