import {ALL_EVENT_TYPES, getAvailableEventTypes, needDivider, toggleEventType} from 'ghost-admin/utils/member-event-types';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit | Utility | event-type-utils', function () {
    it('should return available event types with settings and features applied', function () {
        const settings = {
            commentsEnabled: 'on',
            emailTrackClicks: true
        };
        const feature = {
            audienceFeedback: true,
            tipsAndDonations: true
        };
        const hiddenEvents = [];

        const eventTypes = getAvailableEventTypes(settings, feature, hiddenEvents);

        expect(eventTypes).to.deep.include({event: 'comment_event', icon: 'filter-dropdown-comments', name: 'Comments', group: 'others'});
        expect(eventTypes).to.deep.include({event: 'feedback_event', icon: 'filter-dropdown-feedback', name: 'Feedback', group: 'others'});
        expect(eventTypes).to.deep.include({event: 'click_event', icon: 'filter-dropdown-clicked-in-email', name: 'Clicked link in email', group: 'others'});
    });

    it('should toggle both payment_event and donation_event when toggling payment_event', function () {
        const eventTypes = [
            {event: 'payment_event', isSelected: true}
        ];

        const newExcludedEvents = toggleEventType('payment_event', eventTypes);

        expect(newExcludedEvents).to.equal('payment_event,donation_event');
    });

    it('should toggle both payment_event and donation_event off when toggling payment_event off', function () {
        const eventTypes = [
            {event: 'payment_event', isSelected: false}
        ];

        const newExcludedEvents = toggleEventType('payment_event', eventTypes);

        expect(newExcludedEvents).to.equal('');
    });

    it('should return correct divider need based on event groups', function () {
        const event = {group: 'auth'};
        const prevEvent = {group: 'payments'};

        const result = needDivider(event, prevEvent);

        expect(result).to.be.true;
    });

    it('should return only base event types when no settings or features are enabled', function () {
        const settings = {
            commentsEnabled: 'off',
            emailTrackClicks: false
        };
        const feature = {
            audienceFeedback: false,
            tipsAndDonations: false
        };
        const hiddenEvents = [];

        const eventTypes = getAvailableEventTypes(settings, feature, hiddenEvents);

        expect(eventTypes).to.deep.equal(ALL_EVENT_TYPES);
    });
});
