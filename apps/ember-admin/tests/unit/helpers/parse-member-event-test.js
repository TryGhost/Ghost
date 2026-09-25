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
        it('returns "started paid subscription" for a created subscription_event', function () {
            const event = buildEvent({
                type: 'subscription_event',
                data: {type: 'created'}
            });
            const result = helper.compute([event]);
            expect(result.action).to.equal('started paid subscription');
        });
    });

    describe('automated_email_sent_event action', function () {
        it('returns the welcome email label for welcome automation slugs', function () {
            const event = buildEvent({
                type: 'automated_email_sent_event',
                data: {
                    automatedEmail: {
                        source: 'automated_email',
                        slug: 'member-welcome-email-paid',
                        name: 'Welcome Email (Paid)',
                        subject: 'Welcome to the paid tier'
                    }
                }
            });
            const result = helper.compute([event]);
            expect(result.action).to.equal('received welcome email (Paid)');
            expect(result.actionTitle).to.equal('received welcome email (Paid)');
            expect(result.info).to.equal(undefined);
            expect(result.description).to.equal(undefined);
        });

        it('returns the email subject inline for automation action revision rows', function () {
            const event = buildEvent({
                type: 'automated_email_sent_event',
                data: {
                    automatedEmail: {
                        source: 'automation_action_revision',
                        slug: 'member-welcome-email-free',
                        name: 'New member onboarding',
                        subject: 'Here is how to get started'
                    }
                }
            });
            const result = helper.compute([event]);
            expect(result.action).to.equal('received automated email: Here is how to get started');
            expect(result.actionTitle).to.equal('received automated email: Here is how to get started');
            expect(result.info).to.equal(undefined);
            expect(result.description).to.equal(undefined);
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

    describe('gift_redemption_event', function () {
        it('returns "started gift subscription" action', function () {
            const event = buildEvent({type: 'gift_redemption_event'});
            const result = helper.compute([event]);
            expect(result.action).to.equal('started gift subscription');
        });

        it('returns "event-gift" icon', function () {
            const event = buildEvent({type: 'gift_redemption_event'});
            const result = helper.compute([event]);
            expect(result.icon).to.equal('event-gift');
        });
    });

    describe('gift_ended_event', function () {
        it('returns "gift subscription expired" action', function () {
            const event = buildEvent({type: 'gift_ended_event'});
            const result = helper.compute([event]);
            expect(result.action).to.equal('gift subscription expired');
        });

        it('returns "event-gift" icon', function () {
            const event = buildEvent({type: 'gift_ended_event'});
            const result = helper.compute([event]);
            expect(result.icon).to.equal('event-gift');
        });
    });

    describe('metafield_change_event', function () {
        function fields(...names) {
            return names.map((name, index) => ({namespace: 'custom', key: `field_${index}`, name}));
        }

        it('names the fields that changed and where', function () {
            const event = buildEvent({
                type: 'metafield_change_event',
                data: {source: 'portal', metafields: fields('Home address', 'Job title')}
            });
            const result = helper.compute([event]);
            expect(result.action).to.equal('updated Home address and Job title in Portal');
            expect(result.icon).to.equal('event-metafields-changed');
        });

        it('counts the rest once a list is too long to read at a glance', function () {
            const event = buildEvent({
                type: 'metafield_change_event',
                data: {source: 'import', metafields: fields('A', 'B', 'C', 'D', 'E')}
            });
            expect(helper.compute([event]).action).to.equal('updated A, B, C and 2 more fields from an import');
        });

        it('leaves out a place it does not know', function () {
            const event = buildEvent({type: 'metafield_change_event', data: {source: 'somewhere_new', metafields: fields('Job title')}});
            expect(helper.compute([event]).action).to.equal('updated Job title');
        });
    });
});
