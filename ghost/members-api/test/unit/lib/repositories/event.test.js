const should = require('should');
const EventRepository = require('../../../../lib/repositories/EventRepository');
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
            res.should.be.an.Array();
            res.should.have.lengthOf(2);

            res[0].should.eql({
                type: 'email_delivered_event'
            });
            should(res[1]).be.undefined();
        });

        it('passes when using it correctly with multiple filters', function () {
            const res = eventRepository.getNQLSubset('type:-[email_delivered_event,email_opened_event,email_failed_event]+data.created_at:<0+data.member_id:123');
            res.should.be.an.Array();
            res.should.have.lengthOf(2);

            res[0].should.eql({
                type: {
                    $nin: [
                        'email_delivered_event',
                        'email_opened_event',
                        'email_failed_event'
                    ]
                }
            });
            res[1].should.eql({
                $and: [{
                    'data.created_at': {
                        $lt: 0
                    }
                }, {
                    'data.member_id': 123
                }]
            });
        });

        it('passes when using it correctly with multiple filters used several times', function () {
            const res = eventRepository.getNQLSubset('type:-email_delivered_event+data.created_at:<0+data.member_id:123+type:-[email_opened_event,email_failed_event]+data.created_at:>10');
            res.should.be.an.Array();
            res.should.have.lengthOf(2);
            res[0].should.eql({
                $and: [{
                    type: {
                        $ne: 'email_delivered_event'
                    }
                }, {
                    type: {
                        $nin: [
                            'email_opened_event',
                            'email_failed_event'
                        ]
                    }
                }]
            });
            res[1].should.eql({
                $and: [{
                    'data.created_at': {
                        $lt: 0
                    }
                }, {
                    'data.member_id': 123
                }, {
                    'data.created_at': {
                        $gt: 10
                    }
                }]
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
            sinon.assert.calledOnce(fake);
            fake.getCall(0).firstArg.should.match({
                withRelated: ['member', 'newsletter'],
                filter: 'custom:true'
            });
        });

        it('works when setting a created_at filter', async function () {
            await eventRepository.getNewsletterSubscriptionEvents({}, {
                'data.created_at': 'data.created_at:123'
            });

            sinon.assert.calledOnce(fake);
            fake.getCall(0).firstArg.should.match({
                withRelated: ['member', 'newsletter'],
                filter: 'custom:true'
            });
        });

        it('works when setting a combination of filters', async function () {
            await eventRepository.getNewsletterSubscriptionEvents({}, {
                'data.created_at': 'data.created_at:123+data.created_at:<99999',
                'data.member_id': 'data.member_id:-[3,4,5]+data.member_id:-[1,2,3]'
            });

            sinon.assert.calledOnce(fake);
            fake.getCall(0).firstArg.should.match({
                withRelated: ['member', 'newsletter'],
                filter: 'custom:true'
            });
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
                order: 'created_at desc, id desc'
            }, {
                type: 'unused'
            });

            fake.calledOnce.should.be.eql(true);
            fake.getCall(0).firstArg.should.match({
                withRelated: ['member', 'email'],
                filter: 'failed_at:-null+custom:true',
                order: 'failed_at desc, id desc'
            });
        });

        it('works when setting a created_at filter', async function () {
            await eventRepository.getEmailDeliveredEvents({
                order: 'created_at desc, id desc'
            }, {
                'data.created_at': 'data.created_at:123'
            });

            fake.calledOnce.should.be.eql(true);
            fake.getCall(0).firstArg.should.match({
                withRelated: ['member', 'email'],
                filter: 'delivered_at:-null+custom:true',
                order: 'delivered_at desc, id desc'
            });
        });

        it('works when setting a combination of filters', async function () {
            await eventRepository.getEmailOpenedEvents({
                order: 'created_at desc, id desc'
            }, {
                'data.created_at': 'data.created_at:123+data.created_at:<99999',
                'data.member_id': 'data.member_id:-[3,4,5]+data.member_id:-[1,2,3]'
            });

            fake.calledOnce.should.be.eql(true);
            fake.getCall(0).firstArg.should.match({
                withRelated: ['member', 'email'],
                filter: 'opened_at:-null+custom:true',
                order: 'opened_at desc, id desc'
            });
        });
    });
});
