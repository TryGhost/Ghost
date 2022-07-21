const should = require('should');
const EventRepository = require('../../../../lib/repositories/event');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

describe('EventRepository', function () {
    describe('getNQLSubset', function () {
        let eventRepository;

        before(function () {
            eventRepository = new EventRepository({
                EmailRecipient: null,
                MemberSubscribeEvent: null,
                MemberPaymentEvent: null,
                MemberStatusEvent: null,
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null
            });
        });

        it('throws when processing a filter with parenthesis', function () {
            should.throws(() => {
                eventRepository.getNQLSubset('(type:1)');
            }, errors.IncorrectUsageError);
            should.throws(() => {
                eventRepository.getNQLSubset('type:1+(data.created_at:1+data.member_id:1)');
            }, errors.IncorrectUsageError);
        });

        it('throws when using properties that aren\'t in the allowlist', function () {
            should.throws(() => {
                eventRepository.getNQLSubset('(types:1)');
            }, errors.IncorrectUsageError);
        });

        it('throws when using an OR', function () {
            should.throws(() => {
                eventRepository.getNQLSubset('type:1,data.created_at:1');
            }, errors.IncorrectUsageError);

            should.throws(() => {
                eventRepository.getNQLSubset('type:1+data.created_at:1,data.member_id:1');
            }, errors.IncorrectUsageError);

            should.throws(() => {
                eventRepository.getNQLSubset('type:1,data.created_at:1+data.member_id:1');
            }, errors.IncorrectUsageError);
        });

        it('passes when using it correctly with one filter', function () {
            const res = eventRepository.getNQLSubset('type:email_delivered_event');
            res.should.be.an.Object();
            res.should.deepEqual({
                type: 'type:email_delivered_event'
            });
        });

        it('passes when using it correctly with multiple filters', function () {
            const res = eventRepository.getNQLSubset('type:-[email_delivered_event,email_opened_event,email_failed_event]+data.created_at:<0+data.member_id:123');
            res.should.be.an.Object();
            res.should.deepEqual({
                'data.created_at': 'data.created_at:<0',
                'data.member_id': 'data.member_id:123',
                type: 'type:-[email_delivered_event,email_opened_event,email_failed_event]'
            });
        });

        it('passes when using it correctly with multiple filters used several times', function () {
            const res = eventRepository.getNQLSubset('type:-email_delivered_event+data.created_at:<0+data.member_id:123+type:-[email_opened_event,email_failed_event]+data.created_at:>10');
            res.should.be.an.Object();
            res.should.deepEqual({
                'data.created_at': 'data.created_at:<0+data.created_at:>10',
                'data.member_id': 'data.member_id:123',
                type: 'type:-email_delivered_event+type:-[email_opened_event,email_failed_event]'
            });
        });
    });

    describe('getNewsletterSubscriptionEvents', function () {
        let eventRepository;
        let fake;

        before(function () {
            fake = sinon.fake.returns({data: [{toJSON: () => {}}]});
            eventRepository = new EventRepository({
                EmailRecipient: null,
                MemberSubscribeEvent: {
                    findPage: fake
                },
                MemberPaymentEvent: null,
                MemberStatusEvent: null,
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null
            });
        });

        afterEach(function () {
            fake.resetHistory();
        });

        it('works when setting no filters', async function () {
            await eventRepository.getNewsletterSubscriptionEvents({
                filter: 'no used'
            }, {
                type: 'unused'
            });
            fake.calledOnceWithExactly({
                withRelated: ['member', 'newsletter'],
                filter: ''
            }).should.be.eql(true);
        });

        it('works when setting a created_at filter', async function () {
            await eventRepository.getNewsletterSubscriptionEvents({}, {
                'data.created_at': 'data.created_at:123'
            });
            fake.calledOnceWithExactly({
                withRelated: ['member', 'newsletter'],
                filter: 'created_at:123'
            }).should.be.eql(true);
        });

        it('works when setting a combination of filters', async function () {
            await eventRepository.getNewsletterSubscriptionEvents({}, {
                'data.created_at': 'data.created_at:123+data.created_at:<99999',
                'data.member_id': 'data.member_id:-[3,4,5]+data.member_id:-[1,2,3]'
            });
            fake.calledOnceWithExactly({
                withRelated: ['member', 'newsletter'],
                filter: 'created_at:123+created_at:<99999+member_id:-[3,4,5]+member_id:-[1,2,3]'
            }).should.be.eql(true);
        });
    });

    describe('getEmailFailedEvents', function () {
        let eventRepository;
        let fake;

        before(function () {
            fake = sinon.fake.returns({data: [{get: () => {}, related: () => ({toJSON: () => {}})}]});
            eventRepository = new EventRepository({
                EmailRecipient: {
                    findPage: fake
                },
                MemberSubscribeEvent: null,
                MemberPaymentEvent: null,
                MemberStatusEvent: null,
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null
            });
        });

        afterEach(function () {
            fake.resetHistory();
        });

        it('works when setting no filters', async function () {
            await eventRepository.getEmailFailedEvents({
                filter: 'no used',
                order: 'created_at desc'
            }, {
                type: 'unused'
            });
            fake.calledOnceWithExactly({
                withRelated: ['member', 'email'],
                filter: 'failed_at:-null',
                order: 'failed_at desc'
            }).should.be.eql(true);
        });

        it('works when setting a created_at filter', async function () {
            await eventRepository.getEmailDeliveredEvents({
                order: 'created_at desc'
            }, {
                'data.created_at': 'data.created_at:123'
            });
            fake.calledOnceWithExactly({
                withRelated: ['member', 'email'],
                filter: 'delivered_at:-null+delivered_at:123',
                order: 'delivered_at desc'
            }).should.be.eql(true);
        });

        it('works when setting a combination of filters', async function () {
            await eventRepository.getEmailOpenedEvents({
                order: 'created_at desc'
            }, {
                'data.created_at': 'data.created_at:123+data.created_at:<99999',
                'data.member_id': 'data.member_id:-[3,4,5]+data.member_id:-[1,2,3]'
            });
            fake.calledOnceWithExactly({
                withRelated: ['member', 'email'],
                filter: 'opened_at:-null+opened_at:123+opened_at:<99999+member_id:-[3,4,5]+member_id:-[1,2,3]',
                order: 'opened_at desc'
            }).should.be.eql(true);
        });
    });
});
