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
     * Updates the member.last_seen_at field if it was updated more than 24 hours ago
     * @param {string} memberId The id of the member to be udpated
     * @param {string} memberLastSeenAt The previous last_seen_at property value for the current member
     * @param {Date} timestamp The event timestamp
     */
    async updateLastSeenAt(memberId, memberLastSeenAt, timestamp) {
        if (memberLastSeenAt === null || moment(timestamp).diff(memberLastSeenAt, 'hours') > 24) {
            await this._memberModel.update({
                last_seen_at: moment(timestamp).utc().format('YYYY-MM-DD HH:mm:ss')
            }, {
                id: memberId
            });
        }
    }
}

module.exports = LastSeenAtUpdater;
