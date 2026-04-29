import Service from '@ember/service';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Helper: parse-member-event', function () {
    setupTest();

    let helper;

    function buildEvent({type, data = {}} = {}) {
        return {
            type,
            data: {
                created_at: '2026-04-29T12:00:00Z',
                member: {id: 'member-1', name: 'Alice', email: 'alice@example.com'},
                ...data
            }
        };
    }

    beforeEach(function () {
        const MembersUtilsStub = Service.extend({
            paidMembersEnabled: true,
            hasMultipleTiers: false
        });
        this.owner.register('service:members-utils', MembersUtilsStub);

        helper = this.owner.factoryFor('helper:parse-member-event').create();
    });

    describe('subscription_event action', function () {
        it('returns "continued paid subscription after gift" when previous_status is "gift"', function () {
            const event = buildEvent({
                type: 'subscription_event',
                data: {type: 'created', previous_status: 'gift'}
            });
            const result = helper.compute([event]);
            expect(result.action).to.equal('continued paid subscription after gift');
        });

        it('returns "started paid subscription" when previous_status is null', function () {
            const event = buildEvent({
                type: 'subscription_event',
                data: {type: 'created', previous_status: null}
            });
            const result = helper.compute([event]);
            expect(result.action).to.equal('started paid subscription');
        });

        it('returns "started paid subscription" when previous_status is "free"', function () {
            const event = buildEvent({
                type: 'subscription_event',
                data: {type: 'created', previous_status: 'free'}
            });
            const result = helper.compute([event]);
            expect(result.action).to.equal('started paid subscription');
        });

        it('returns "started paid subscription" when previous_status is missing', function () {
            const event = buildEvent({
                type: 'subscription_event',
                data: {type: 'created'}
            });
            const result = helper.compute([event]);
            expect(result.action).to.equal('started paid subscription');
        });
    });

    describe('signup_event info', function () {
        it('returns null when created_with_status is "paid"', function () {
            const event = buildEvent({
                type: 'signup_event',
                data: {created_with_status: 'paid'}
            });
            const result = helper.compute([event]);
            expect(result.info).to.equal(null);
        });

        it('returns null when created_with_status is "comped"', function () {
            const event = buildEvent({
                type: 'signup_event',
                data: {created_with_status: 'comped'}
            });
            const result = helper.compute([event]);
            expect(result.info).to.equal(null);
        });

        it('returns "Free" when created_with_status is "free"', function () {
            const event = buildEvent({
                type: 'signup_event',
                data: {created_with_status: 'free'}
            });
            const result = helper.compute([event]);
            expect(result.info).to.equal('Free');
        });

        it('returns "Free" when created_with_status is null', function () {
            const event = buildEvent({
                type: 'signup_event',
                data: {created_with_status: null}
            });
            const result = helper.compute([event]);
            expect(result.info).to.equal('Free');
        });

        it('returns "Free" when created_with_status is missing', function () {
            const event = buildEvent({
                type: 'signup_event',
                data: {}
            });
            const result = helper.compute([event]);
            expect(result.info).to.equal('Free');
        });
    });
});
