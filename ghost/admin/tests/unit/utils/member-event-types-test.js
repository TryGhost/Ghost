import {ALL_EVENT_TYPES, getAvailableEventTypes, needDivider, toggleEventType} from 'ghost-admin/utils/member-event-types';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit | Utility | event-type-utils', function () {
    it('should return available event types with settings applied', function () {
        const settings = {
            commentsEnabled: 'on',
            emailTrackClicks: true
        };
        const hiddenEvents = [];

        const eventTypes = getAvailableEventTypes(settings, hiddenEvents);

        expect(eventTypes).to.deep.include({event: 'comment_event', icon: 'filter-dropdown-comments', name: 'Comments', group: 'others'});
        expect(eventTypes).to.deep.include({event: 'feedback_event', icon: 'filter-dropdown-feedback', name: 'Feedback', group: 'others'});
        expect(eventTypes).to.deep.include({event: 'click_event', icon: 'filter-dropdown-clicked-in-email', name: 'Clicked link in email', group: 'others'});
    });

    it('should toggle payment_event together with donation_event and gift_purchase_event when toggling payment_event', function () {
        const newExcludedEvents = toggleEventType('payment_event', []);

        expect(newExcludedEvents).to.equal('payment_event,donation_event,gift_purchase_event');
    });

    it('should toggle payment_event group off when toggling payment_event off', function () {
        const newExcludedEvents = toggleEventType('payment_event', ['payment_event', 'donation_event', 'gift_purchase_event']);

        expect(newExcludedEvents).to.equal('');
    });

    it('should toggle subscription_event together with gift_redemption_event', function () {
        const newExcludedEvents = toggleEventType('subscription_event', []);

        expect(newExcludedEvents).to.equal('subscription_event,gift_redemption_event');
    });

    it('should toggle subscription_event group off when toggling subscription_event off', function () {
        const newExcludedEvents = toggleEventType('subscription_event', ['subscription_event', 'gift_redemption_event']);

        expect(newExcludedEvents).to.equal('');
    });

    it('should preserve previously-excluded payment group when toggling subscription_event', function () {
        const newExcludedEvents = toggleEventType('subscription_event', ['payment_event', 'donation_event', 'gift_purchase_event']);

        expect(newExcludedEvents).to.equal('payment_event,donation_event,gift_purchase_event,subscription_event,gift_redemption_event');
    });

    it('should preserve previously-excluded subscription group when toggling payment_event', function () {
        const newExcludedEvents = toggleEventType('payment_event', ['subscription_event', 'gift_redemption_event']);

        expect(newExcludedEvents).to.equal('subscription_event,gift_redemption_event,payment_event,donation_event,gift_purchase_event');
    });

    it('should accept a comma-separated string for currentExcludedEvents', function () {
        const newExcludedEvents = toggleEventType('subscription_event', 'payment_event,donation_event,gift_purchase_event');

        expect(newExcludedEvents).to.equal('payment_event,donation_event,gift_purchase_event,subscription_event,gift_redemption_event');
    });

    it('should return correct divider need based on event groups', function () {
        const event = {group: 'auth'};
        const prevEvent = {group: 'payments'};

        const result = needDivider(event, prevEvent);

        expect(result).to.be.true;
    });

    it('should return base event types when no conditional settings are enabled', function () {
        const settings = {
            commentsEnabled: 'off',
            emailTrackClicks: false
        };
        const hiddenEvents = [];

        const eventTypes = getAvailableEventTypes(settings, hiddenEvents);

        const expectedTypes = [...ALL_EVENT_TYPES];
        expect(eventTypes).to.deep.equal(expectedTypes);
    });
});
