const DomainEvents = require('@tryghost/domain-events');
const {MemberEntryViewEvent} = require('@tryghost/member-events');

const AnalyticEvent = require('./AnalyticEvent');

class AnalyticsService {
    /**
     * @param {import('./AnalyticEventRepository')} repository
     */
    constructor(repository) {
        /** @private */
        this.repository = repository;
    }

    /**
     * Listens for member events and handles creating analytic events and storing them.
     */
    setupSubscribers() {
        DomainEvents.subscribe(MemberEntryViewEvent, async (ev) => {
            const event = AnalyticEvent.create({
                name: 'entry_view',
                memberId: ev.data.memberId,
                memberStatus: ev.data.memberStatus,
                entryId: ev.data.entryId,
                sourceUrl: ev.data.entryUrl,
                timestamp: ev.timestamp
            });

            await this.repository.save(event);
        });
    }
}

module.exports = AnalyticsService;
