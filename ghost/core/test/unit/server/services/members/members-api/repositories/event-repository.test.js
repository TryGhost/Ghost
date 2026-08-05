const assert = require('node:assert/strict');
const EventRepository = require('../../../../../../../core/server/services/members/members-api/repositories/event-repository');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

describe('EventRepository', function () {
    describe('getNQLSubset', function () {
        let eventRepository;

        beforeAll(function () {
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

        beforeAll(function () {
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

        beforeAll(function () {
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

    describe('attribution event queries', function () {
        // The lazy URL service needs the attributed post's relations to
        // build its URL; a bare postAttribution row is rejected as thin.
        function makeRepository(modelName, requiredRelations = ['tags', 'authors']) {
            const fake = sinon.fake.resolves({data: [], meta: {}});
            const eventRepository = new EventRepository({
                EmailRecipient: null,
                MemberSubscribeEvent: null,
                MemberPaymentEvent: null,
                MemberStatusEvent: null,
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null,
                urlService: {getRequiredRelations: () => requiredRelations},
                [modelName]: {findPage: fake}
            });
            return {eventRepository, fake};
        }

        it('getSignupEvents loads the attributed post relations', async function () {
            const {eventRepository, fake} = makeRepository('MemberCreatedEvent');

            await eventRepository.getSignupEvents({}, {});

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: sinon.match.array.contains(['postAttribution', 'postAttribution.tags', 'postAttribution.authors'])
            });
        });

        it('getDonationEvents loads the attributed post relations', async function () {
            const {eventRepository, fake} = makeRepository('DonationPaymentEvent');

            await eventRepository.getDonationEvents({}, {});

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: sinon.match.array.contains(['postAttribution', 'postAttribution.tags', 'postAttribution.authors'])
            });
        });

        it('getSubscriptionEvents loads the attributed post relations', async function () {
            const {eventRepository, fake} = makeRepository('MemberPaidSubscriptionEvent');

            await eventRepository.getSubscriptionEvents({}, {});

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: sinon.match.array.contains([
                    'subscriptionCreatedEvent.postAttribution',
                    'subscriptionCreatedEvent.postAttribution.tags',
                    'subscriptionCreatedEvent.postAttribution.authors'
                ])
            });
        });

        it('loads no extra relations when the URL service requires none', async function () {
            const {eventRepository, fake} = makeRepository('MemberCreatedEvent', []);

            await eventRepository.getSignupEvents({}, {});

            const withRelated = fake.getCall(0).args[0].withRelated;
            assert.ok(!withRelated.includes('postAttribution.tags'));
            assert.ok(withRelated.includes('postAttribution'));
        });
    });

    describe('getEmailFailedEvents', function () {
        let eventRepository;
        let fake;

        beforeAll(function () {
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
        let fakeKnex;
        let models;
        let automationActionRevisionSubject;

        const makeAutomatedEmailRecipient = ({
            automatedEmailId = 'ae123',
            automationActionRevisionId = null
        } = {}) => {
            return {
                get: (key) => {
                    if (key === 'automated_email_id') {
                        return automatedEmailId;
                    }
                    if (key === 'automation_action_revision_id') {
                        return automationActionRevisionId;
                    }
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
                },
                id: 'aer123'
            };
        };

        beforeAll(function () {
            models = [makeAutomatedEmailRecipient()];
            automationActionRevisionSubject = 'Here is how to get started';
            fake = sinon.fake(() => ({data: models}));
            fakeKnex = sinon.fake((tableName) => {
                return {
                    select() {
                        return this;
                    },
                    innerJoin() {
                        return this;
                    },
                    whereIn(_column, ids) {
                        if (tableName === 'welcome_email_automated_emails as email') {
                            return [{
                                id: ids[0],
                                slug: 'member-welcome-email-free',
                                name: 'Free member welcome flow',
                                subject: 'Welcome to the free tier'
                            }];
                        }

                        if (tableName === 'automation_action_revisions as revision') {
                            return [{
                                id: ids[0],
                                slug: 'member-welcome-email-free',
                                name: 'New member onboarding',
                                subject: automationActionRevisionSubject
                            }];
                        }

                        return [];
                    }
                };
            });
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
            eventRepository._knex = fakeKnex;
        });

        afterEach(function () {
            models = [makeAutomatedEmailRecipient()];
            automationActionRevisionSubject = 'Here is how to get started';
            fake.resetHistory();
            fakeKnex.resetHistory();
        });

        it('works when setting no filters', async function () {
            await eventRepository.getAutomatedEmailSentEvents({
                filter: 'no used',
                order: 'created_at desc, id desc'
            }, {
                type: 'unused'
            });

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: ['member'],
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
                withRelated: ['member'],
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
                withRelated: ['member'],
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
                        source: 'automated_email',
                        slug: 'member-welcome-email-free',
                        name: 'Free member welcome flow',
                        subject: 'Welcome to the free tier'
                    }
                }
            });
        });

        it('returns correctly formatted automated_email_sent_event for automation action revision rows', async function () {
            models = [makeAutomatedEmailRecipient({
                automatedEmailId: null,
                automationActionRevisionId: 'aar123'
            })];

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
                        id: 'aar123',
                        source: 'automation_action_revision',
                        slug: 'member-welcome-email-free',
                        name: 'New member onboarding',
                        subject: 'Here is how to get started'
                    }
                }
            });
        });

        it('throws when an automation action revision row has no subject', async function () {
            models = [makeAutomatedEmailRecipient({
                automatedEmailId: null,
                automationActionRevisionId: 'aar123'
            })];
            automationActionRevisionSubject = null;

            await assert.rejects(
                () => eventRepository.getAutomatedEmailSentEvents({
                    order: 'created_at desc, id desc'
                }, {}),
                {
                    name: 'InternalServerError',
                    message: 'Automated email recipient aer123 has no associated automation email subject'
                }
            );
        });
    });

    describe('getGiftEndedEvents', function () {
        let eventRepository;
        let fake;

        beforeAll(function () {
            fake = sinon.fake.returns({data: [{
                toJSON: () => ({
                    id: 'status-event-1',
                    member_id: 'member-abc',
                    member: {id: 'member-abc', name: 'Test Member', email: 'member@example.com'},
                    from_status: 'gift',
                    to_status: 'free',
                    created_at: '2024-10-15T08:00:00.000Z'
                })
            }]});
            eventRepository = new EventRepository({
                EmailRecipient: null,
                MemberSubscribeEvent: null,
                MemberPaymentEvent: null,
                MemberStatusEvent: {
                    findPage: fake
                },
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null
            });
        });

        afterEach(function () {
            fake.resetHistory();
        });

        it('queries with correct options', async function () {
            await eventRepository.getGiftEndedEvents({
                filter: 'not used',
                order: 'created_at desc, id desc'
            }, {
                type: 'unused'
            });

            sinon.assert.calledOnceWithMatch(fake, {
                withRelated: ['member'],
                filter: 'from_status:gift+to_status:free+custom:true',
                order: 'created_at desc, id desc'
            });
        });

        it('returns correctly formatted gift_ended_event', async function () {
            const result = await eventRepository.getGiftEndedEvents({
                order: 'created_at desc, id desc'
            }, {});

            assert.equal(result.data.length, 1);

            const event = result.data[0];

            assert.equal(event.type, 'gift_ended_event');
            assert.equal(event.data.id, 'status-event-1');
            assert.equal(event.data.member_id, 'member-abc');
            assert.equal(event.data.created_at, '2024-10-15T08:00:00.000Z');
            assert.deepEqual(event.data.member, {
                id: 'member-abc',
                name: 'Test Member',
                email: 'member@example.com'
            });
        });

        it('sets member to null when member relation is not present', async function () {
            const nullMemberFake = sinon.fake.returns({data: [{
                toJSON: () => ({
                    id: 'status-event-2',
                    member_id: 'member-xyz',
                    member: null,
                    from_status: 'gift',
                    to_status: 'free',
                    created_at: '2024-11-01T12:00:00.000Z'
                })
            }]});
            const repo = new EventRepository({
                EmailRecipient: null,
                MemberSubscribeEvent: null,
                MemberPaymentEvent: null,
                MemberStatusEvent: {
                    findPage: nullMemberFake
                },
                MemberLoginEvent: null,
                MemberPaidSubscriptionEvent: null,
                labsService: null
            });

            const result = await repo.getGiftEndedEvents({}, {});
            const event = result.data[0];

            assert.equal(event.data.member, null);
            assert.equal(event.data.member_id, 'member-xyz');
        });
    });
});
