const DomainEvents = require('@tryghost/domain-events');
const {
    MemberEntryViewEvent,
    MemberUnsubscribeEvent,
    MemberSignupEvent,
    MemberPaidConverstionEvent,
    MemberPaidCancellationEvent
} = require('@tryghost/member-events');

const AnalyticEvent = require('./AnalyticEvent');

class EventHandler {
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

        DomainEvents.subscribe(MemberUnsubscribeEvent, async (ev) => {
            const event = AnalyticEvent.create({
                name: 'unsubscribe',
                memberId: ev.data.memberId,
                memberStatus: ev.data.memberStatus,
                entryId: ev.data.entryId,
                sourceUrl: ev.data.sourceUrl,
                timestamp: ev.timestamp
            });

            await this.repository.save(event);
        });

        DomainEvents.subscribe(MemberSignupEvent, async (ev) => {
            const event = AnalyticEvent.create({
                name: 'signup',
                memberId: ev.data.memberId,
                memberStatus: 'free',
                entryId: ev.data.entryId,
                sourceUrl: ev.data.sourceUrl,
                timestamp: ev.timestamp
            });

            await this.repository.save(event);
        });

        DomainEvents.subscribe(MemberPaidCancellationEvent, async (ev) => {
            const event = AnalyticEvent.create({
                name: 'paid_cancellation',
                memberId: ev.data.memberId,
                memberStatus: ev.data.memberStatus,
                entryId: ev.data.entryId,
                sourceUrl: ev.data.sourceUrl,
                metadata: ev.data.subscriptionId,
                timestamp: ev.timestamp
            });

            await this.repository.save(event);
        });

        DomainEvents.subscribe(MemberPaidConverstionEvent, async (ev) => {
            const event = AnalyticEvent.create({
                name: 'paid_conversion',
                memberId: ev.data.memberId,
                memberStatus: ev.data.memberStatus,
                entryId: ev.data.entryId,
                sourceUrl: ev.data.sourceUrl,
                metadata: ev.data.subscriptionId,
                timestamp: ev.timestamp
            });

            await this.repository.save(event);
        });
    }
}

module.exports = EventHandler;
