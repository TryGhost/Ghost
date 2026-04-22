const assert = require('node:assert/strict');
const EventRepository = require('../../../../../../../core/server/services/members/members-api/repositories/event-repository');
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

        it('throws when using invalid filter', function () {
            assert.throws(() => {
                eventRepository.getNQLSubset('undefined');
            }, errors.BadRequestError);
        });

        it('throws when using properties that aren\'t in the allowlist', function () {
            assert.throws(() => {
                eventRepository.getNQLSubset('(types:1)');
            }, errors.IncorrectUsageError);
        });

        it('throws when using an OR', function () {
            assert.throws(() => {
                eventRepository.getNQLSubset('type:1,data.created_at:1');
            }, errors.IncorrectUsageError);

            assert.throws(() => {
                eventRepository.getNQLSubset('type:1+data.created_at:1,data.member_id:1');
            }, errors.IncorrectUsageError);

            assert.throws(() => {
                eventRepository.getNQLSubset('type:1,data.created_at:1+data.member_id:1');
            }, errors.IncorrectUsageError);
        });

        it('passes when using it correctly with one filter', function () {
            const res = eventRepository.getNQLSubset('type:email_delivered_event');
            assert.ok(Array.isArray(res));
            assert.equal(res.length, 2);

            assert.deepEqual(res[0], {
                type: 'email_delivered_event'
            });
            assert.equal(res[1], undefined);
        });

        it('passes when using it correctly with multiple filters', function () {
            const res = eventRepository.getNQLSubset('type:-[email_delivered_event,email_opened_event,email_failed_event]+data.created_at:<0+data.member_id:123');
            assert.ok(Array.isArray(res));
            assert.equal(res.length, 2);

            assert.deepEqual(res[0], {
                type: {
                    $nin: [
                        'email_delivered_event',
                        'email_opened_event',
                        'email_failed_event'
                    ]
                }
            });
            assert.deepEqual(res[1], {
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
            assert.ok(Array.isArray(res));
            assert.equal(res.length, 2);
            assert.deepEqual(res[0], {
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
            assert.deepEqual(res[1], {
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

    describe('getPostIdFromFilter', function () {
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

        it('returns ObjectID for valid hex string', function () {
            const filter = {'data.post_id': '507f1f77bcf86cd799439011'};
            const result = eventRepository.getPostIdFromFilter(filter);
            assert.ok(result);
            assert.equal(result.toHexString(), '507f1f77bcf86cd799439011');
        });

        it('extracts post_id from $and condition', function () {
            const filter = {
                $and: [
                    {'data.post_id': '507f1f77bcf86cd799439011'},
                    {'data.member_id': '123'}
                ]
            };
            const result = eventRepository.getPostIdFromFilter(filter);
            assert.ok(result);
            assert.equal(result.toHexString(), '507f1f77bcf86cd799439011');
        });

        it('returns null for invalid ObjectID string', function () {
            const filter = {'data.post_id': 'not-a-valid-id'};
            const result = eventRepository.getPostIdFromFilter(filter);
            assert.equal(result, null);
        });

        it('rejects SQL injection attempts', function () {
            const filter = {'data.post_id': '\'; DROP TABLE posts; --'};
            const result = eventRepository.getPostIdFromFilter(filter);
            assert.equal(result, null);
        });

        it('returns null when filter is missing or undefined', function () {
            assert.equal(eventRepository.getPostIdFromFilter(null), null);
            assert.equal(eventRepository.getPostIdFromFilter(undefined), null);
            assert.equal(eventRepository.getPostIdFromFilter({}), null);
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
            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: ['member', 'newsletter'],
                filter: 'custom:true'
            });
        });

        it('works when setting a created_at filter', async function () {
            await eventRepository.getNewsletterSubscriptionEvents({}, {
                'data.created_at': 'data.created_at:123'
            });

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: ['member', 'newsletter'],
                filter: 'custom:true'
            });
        });

        it('works when setting a combination of filters', async function () {
            await eventRepository.getNewsletterSubscriptionEvents({}, {
                'data.created_at': 'data.created_at:123+data.created_at:<99999',
                'data.member_id': 'data.member_id:-[3,4,5]+data.member_id:-[1,2,3]'
            });

            sinon.assert.calledOnceWithMatch(fake, {
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

            sinon.assert.calledOnceWithMatch(fake, {
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

            sinon.assert.calledOnceWithMatch(fake, {
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

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: ['member', 'email'],
                filter: 'opened_at:-null+custom:true',
                order: 'opened_at desc, id desc'
            });
        });
    });

    describe('getAutomatedEmailSentEvents', function () {
        let eventRepository;
        let fake;

        before(function () {
            fake = sinon.fake.returns({data: [{
                get: (key) => {
                    if (key === 'member_id') {
                        return '123';
                    }
                    if (key === 'created_at') {
                        return new Date('2024-01-01');
                    }
                },
                related: (relation) => {
                    if (relation === 'member') {
                        return {toJSON: () => ({id: '123', email: 'test@example.com'})};
                    }
                    if (relation === 'automatedEmail') {
                        return {
                            id: 'ae123',
                            related: (rel) => {
                                if (rel === 'welcomeEmailAutomation') {
                                    return {
                                        id: 'auto123',
                                        get: key => (key === 'slug' ? 'member-welcome-email-free' : undefined)
                                    };
                                }
                            }
                        };
                    }
                },
                id: 'aer123'
            }]});
            eventRepository = new EventRepository({
                EmailRecipient: null,
                MemberSubscribeEvent: null,
                MemberPaymentEvent: null,
                MemberStatusEvent: null,
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null,
                AutomatedEmailRecipient: {
                    findPage: fake
                }
            });
        });

        afterEach(function () {
            fake.resetHistory();
        });

        it('works when setting no filters', async function () {
            await eventRepository.getAutomatedEmailSentEvents({
                filter: 'no used',
                order: 'created_at desc, id desc'
            }, {
                type: 'unused'
            });

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: ['member', 'automatedEmail.welcomeEmailAutomation'],
                filter: 'custom:true',
                order: 'created_at desc, id desc'
            });
        });

        it('works when setting a created_at filter', async function () {
            await eventRepository.getAutomatedEmailSentEvents({
                order: 'created_at desc, id desc'
            }, {
                'data.created_at': 'data.created_at:123'
            });

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: ['member', 'automatedEmail.welcomeEmailAutomation'],
                filter: 'custom:true',
                order: 'created_at desc, id desc'
            });
        });

        it('works when setting a combination of filters', async function () {
            await eventRepository.getAutomatedEmailSentEvents({
                order: 'created_at desc, id desc'
            }, {
                'data.created_at': 'data.created_at:123+data.created_at:<99999',
                'data.member_id': 'data.member_id:-[3,4,5]+data.member_id:-[1,2,3]'
            });

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: ['member', 'automatedEmail.welcomeEmailAutomation'],
                filter: 'custom:true',
                order: 'created_at desc, id desc'
            });
        });

        it('returns correctly formatted automated_email_sent_event', async function () {
            const result = await eventRepository.getAutomatedEmailSentEvents({
                order: 'created_at desc, id desc'
            }, {});

            assert.equal(result.data.length, 1);
            assert.deepEqual(result.data[0], {
                type: 'automated_email_sent_event',
                data: {
                    id: 'aer123',
                    member_id: '123',
                    created_at: new Date('2024-01-01'),
                    member: {id: '123', email: 'test@example.com'},
                    automatedEmail: {
                        id: 'ae123',
                        slug: 'member-welcome-email-free'
                    }
                }
            });
        });
    });

    describe('getGiftPurchaseEvents', function () {
        let eventRepository;
        let fake;

        before(function () {
            fake = sinon.fake.returns({data: [{
                toJSON: () => ({
                    id: 'gift123',
                    buyer_member_id: 'member456',
                    buyer: {id: 'member456', name: 'Test Buyer', email: 'buyer@example.com'},
                    tier: {name: 'Silver'},
                    amount: 5000,
                    currency: 'usd',
                    cadence: 'year',
                    duration: 1,
                    purchased_at: '2024-06-15T12:00:00.000Z',
                    token: 'secret-token',
                    stripe_checkout_session_id: 'cs_123',
                    stripe_payment_intent_id: 'pi_123',
                    status: 'purchased'
                })
            }]});
            eventRepository = new EventRepository({
                EmailRecipient: null,
                MemberSubscribeEvent: null,
                MemberPaymentEvent: null,
                MemberStatusEvent: null,
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null,
                Gift: {
                    findPage: fake
                }
            });
        });

        afterEach(function () {
            fake.resetHistory();
        });

        it('queries with correct options', async function () {
            await eventRepository.getGiftPurchaseEvents({
                filter: 'not used',
                order: 'created_at desc, id desc'
            }, {
                type: 'unused'
            });

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: ['buyer', 'tier'],
                filter: 'buyer_member_id:-null+custom:true',
                order: 'purchased_at desc, id desc'
            });
        });

        it('returns correctly formatted gift_event', async function () {
            const result = await eventRepository.getGiftPurchaseEvents({
                order: 'created_at desc, id desc'
            }, {});

            assert.equal(result.data.length, 1);

            const event = result.data[0];

            assert.equal(event.type, 'gift_purchase_event');
            assert.equal(event.data.id, 'gift123');
            assert.equal(event.data.amount, 5000);
            assert.equal(event.data.currency, 'usd');
            assert.equal(event.data.tier_name, 'Silver');
            assert.equal(event.data.cadence, 'year');
            assert.equal(event.data.duration, 1);
            assert.equal(event.data.member_id, 'member456');
            assert.equal(event.data.created_at, '2024-06-15T12:00:00.000Z');
            assert.deepEqual(event.data.member, {
                id: 'member456',
                name: 'Test Buyer',
                email: 'buyer@example.com'
            });
        });

        it('excludes internal fields from event data', async function () {
            const result = await eventRepository.getGiftPurchaseEvents({}, {});

            const event = result.data[0];

            assert.equal(event.data.token, undefined);
            assert.equal(event.data.stripe_checkout_session_id, undefined);
            assert.equal(event.data.stripe_payment_intent_id, undefined);
            assert.equal(event.data.status, undefined);
        });

        it('sets member to null when buyer is not present', async function () {
            const nullBuyerFake = sinon.fake.returns({data: [{
                toJSON: () => ({
                    id: 'gift789',
                    buyer_member_id: null,
                    buyer: null,
                    amount: 3000,
                    currency: 'eur',
                    purchased_at: '2024-07-01T12:00:00.000Z'
                })
            }]});
            const repo = new EventRepository({
                EmailRecipient: null,
                MemberSubscribeEvent: null,
                MemberPaymentEvent: null,
                MemberStatusEvent: null,
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null,
                Gift: {
                    findPage: nullBuyerFake
                }
            });

            const result = await repo.getGiftPurchaseEvents({}, {});
            const event = result.data[0];

            assert.equal(event.data.member, null);
            assert.equal(event.data.member_id, null);
        });
    });

    describe('getGiftRedemptionEvents', function () {
        let eventRepository;
        let fake;

        before(function () {
            fake = sinon.fake.returns({data: [{
                toJSON: () => ({
                    id: 'gift123',
                    redeemer_member_id: 'member789',
                    redeemer: {id: 'member789', name: 'Test Redeemer', email: 'redeemer@example.com'},
                    tier: {name: 'Gold'},
                    amount: 5000,
                    currency: 'usd',
                    cadence: 'year',
                    duration: 1,
                    redeemed_at: '2024-08-20T09:30:00.000Z',
                    token: 'secret-token',
                    stripe_checkout_session_id: 'cs_123',
                    stripe_payment_intent_id: 'pi_123',
                    status: 'redeemed'
                })
            }]});
            eventRepository = new EventRepository({
                EmailRecipient: null,
                MemberSubscribeEvent: null,
                MemberPaymentEvent: null,
                MemberStatusEvent: null,
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null,
                Gift: {
                    findPage: fake
                }
            });
        });

        afterEach(function () {
            fake.resetHistory();
        });

        it('queries with correct options', async function () {
            await eventRepository.getGiftRedemptionEvents({
                filter: 'not used',
                order: 'created_at desc, id desc'
            }, {
                type: 'unused'
            });

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: ['redeemer', 'tier'],
                filter: 'redeemer_member_id:-null+custom:true',
                order: 'redeemed_at desc, id desc'
            });
        });

        it('returns correctly formatted gift_redemption_event', async function () {
            const result = await eventRepository.getGiftRedemptionEvents({
                order: 'created_at desc, id desc'
            }, {});

            assert.equal(result.data.length, 1);

            const event = result.data[0];

            assert.equal(event.type, 'gift_redemption_event');
            assert.equal(event.data.id, 'gift123');
            assert.equal(event.data.amount, 5000);
            assert.equal(event.data.currency, 'usd');
            assert.equal(event.data.tier_name, 'Gold');
            assert.equal(event.data.cadence, 'year');
            assert.equal(event.data.duration, 1);
            assert.equal(event.data.member_id, 'member789');
            assert.equal(event.data.created_at, '2024-08-20T09:30:00.000Z');
            assert.deepEqual(event.data.member, {
                id: 'member789',
                name: 'Test Redeemer',
                email: 'redeemer@example.com'
            });
        });

        it('excludes internal fields from event data', async function () {
            const result = await eventRepository.getGiftRedemptionEvents({}, {});

            const event = result.data[0];

            assert.equal(event.data.token, undefined);
            assert.equal(event.data.stripe_checkout_session_id, undefined);
            assert.equal(event.data.stripe_payment_intent_id, undefined);
            assert.equal(event.data.status, undefined);
        });

        it('sets member to null when redeemer is not present', async function () {
            const nullRedeemerFake = sinon.fake.returns({data: [{
                toJSON: () => ({
                    id: 'gift999',
                    redeemer_member_id: null,
                    redeemer: null,
                    amount: 3000,
                    currency: 'eur',
                    redeemed_at: '2024-09-01T12:00:00.000Z'
                })
            }]});
            const repo = new EventRepository({
                EmailRecipient: null,
                MemberSubscribeEvent: null,
                MemberPaymentEvent: null,
                MemberStatusEvent: null,
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null,
                Gift: {
                    findPage: nullRedeemerFake
                }
            });

            const result = await repo.getGiftRedemptionEvents({}, {});
            const event = result.data[0];

            assert.equal(event.data.member, null);
            assert.equal(event.data.member_id, null);
        });
    });
});
