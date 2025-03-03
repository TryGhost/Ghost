require('should');
const sinon = require('sinon');

const {MemberCreatedEvent, SubscriptionCreatedEvent} = require('@tryghost/member-events');
const EventStorage = require('../../../../../core/server/services/members-events/EventStorage');

describe('EventStorage', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new EventStorage({});
        });
    });

    describe('MemberCreatedEvent handling', function () {
        it('defaults to external for missing attributions', function () {
            const DomainEvents = {
                subscribe: (type, handler) => {
                    if (type === MemberCreatedEvent) {
                        handler(MemberCreatedEvent.create({
                            memberId: '123',
                            source: 'test'
                        }, new Date(0)));
                    }
                }
            };

            const MemberCreatedEventModel = {add: sinon.stub()};
            const labsService = {isSet: sinon.stub().returns(true)};
            const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
            const eventHandler = new EventStorage({
                models: {MemberCreatedEvent: MemberCreatedEventModel},
                labsService
            });
            eventHandler.subscribe(DomainEvents);
            sinon.assert.calledOnceWithMatch(MemberCreatedEventModel.add, {
                member_id: '123',
                created_at: new Date(0),
                source: 'test'
            });
            sinon.assert.calledTwice(subscribeSpy);
        });

        it('passes custom attributions', function () {
            const DomainEvents = {
                subscribe: (type, handler) => {
                    if (type === MemberCreatedEvent) {
                        handler(MemberCreatedEvent.create({
                            memberId: '123',
                            source: 'test',
                            attribution: {
                                id: '123',
                                type: 'post',
                                url: 'url'
                            }
                        }, new Date(0)));
                    }
                }
            };

            const MemberCreatedEventModel = {add: sinon.stub()};
            const labsService = {isSet: sinon.stub().returns(true)};
            const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
            const eventHandler = new EventStorage({
                models: {MemberCreatedEvent: MemberCreatedEventModel},
                labsService
            });
            eventHandler.subscribe(DomainEvents);
            sinon.assert.calledOnceWithMatch(MemberCreatedEventModel.add, {
                member_id: '123',
                created_at: new Date(0),
                attribution_id: '123',
                attribution_type: 'post',
                attribution_url: 'url',
                source: 'test'
            });
            sinon.assert.calledTwice(subscribeSpy);
        });

        it('filters if disabled', function () {
            const DomainEvents = {
                subscribe: (type, handler) => {
                    if (type === MemberCreatedEvent) {
                        handler(MemberCreatedEvent.create({
                            memberId: '123',
                            source: 'test',
                            attribution: {
                                id: '123',
                                type: 'post',
                                url: 'url'
                            }
                        }, new Date(0)));
                    }
                }
            };

            const MemberCreatedEventModel = {add: sinon.stub()};
            const labsService = {isSet: sinon.stub().returns(false)};
            const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
            const eventHandler = new EventStorage({
                models: {MemberCreatedEvent: MemberCreatedEventModel},
                labsService
            });
            eventHandler.subscribe(DomainEvents);
            sinon.assert.calledOnceWithMatch(MemberCreatedEventModel.add, {
                member_id: '123',
                created_at: new Date(0),
                attribution_id: '123',
                attribution_type: 'post',
                attribution_url: 'url',
                source: 'test',
                referrer_source: null,
                referrer_medium: null,
                referrer_url: null
            });
            sinon.assert.calledTwice(subscribeSpy);
        });
    });

    describe('SubscriptionCreatedEvent handling', function () {
        it('defaults to external for missing attributions', function () {
            const DomainEvents = {
                subscribe: (type, handler) => {
                    if (type === SubscriptionCreatedEvent) {
                        handler(SubscriptionCreatedEvent.create({
                            memberId: '123',
                            subscriptionId: '456'
                        }, new Date(0)));
                    }
                }
            };

            const SubscriptionCreatedEventModel = {add: sinon.stub()};
            const labsService = {isSet: sinon.stub().returns(true)};
            const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
            const eventHandler = new EventStorage({
                models: {SubscriptionCreatedEvent: SubscriptionCreatedEventModel},
                labsService
            });
            eventHandler.subscribe(DomainEvents);
            sinon.assert.calledOnceWithMatch(SubscriptionCreatedEventModel.add, {
                member_id: '123',
                subscription_id: '456',
                created_at: new Date(0)
            });
            sinon.assert.calledTwice(subscribeSpy);
        });

        it('passes custom attributions', function () {
            const DomainEvents = {
                subscribe: (type, handler) => {
                    if (type === SubscriptionCreatedEvent) {
                        handler(SubscriptionCreatedEvent.create({
                            memberId: '123',
                            subscriptionId: '456',
                            attribution: {
                                id: '123',
                                type: 'post',
                                url: 'url'
                            }
                        }, new Date(0)));
                    }
                }
            };

            const SubscriptionCreatedEventModel = {add: sinon.stub()};
            const labsService = {isSet: sinon.stub().returns(true)};
            const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
            const eventHandler = new EventStorage({
                models: {SubscriptionCreatedEvent: SubscriptionCreatedEventModel},
                labsService
            });
            eventHandler.subscribe(DomainEvents);
            sinon.assert.calledOnceWithMatch(SubscriptionCreatedEventModel.add, {
                member_id: '123',
                subscription_id: '456',
                created_at: new Date(0),
                attribution_id: '123',
                attribution_type: 'post',
                attribution_url: 'url'
            });
            sinon.assert.calledTwice(subscribeSpy);
        });

        it('works with flag disabled', function () {
            const DomainEvents = {
                subscribe: (type, handler) => {
                    if (type === SubscriptionCreatedEvent) {
                        handler(SubscriptionCreatedEvent.create({
                            memberId: '123',
                            subscriptionId: '456',
                            attribution: {
                                id: '123',
                                type: 'post',
                                url: 'url'
                            }
                        }, new Date(0)));
                    }
                }
            };

            const SubscriptionCreatedEventModel = {add: sinon.stub()};
            const labsService = {isSet: sinon.stub().returns(false)};
            const subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
            const eventHandler = new EventStorage({
                models: {SubscriptionCreatedEvent: SubscriptionCreatedEventModel},
                labsService
            });
            eventHandler.subscribe(DomainEvents);
            sinon.assert.calledOnceWithMatch(SubscriptionCreatedEventModel.add, {
                member_id: '123',
                subscription_id: '456',
                created_at: new Date(0),
                attribution_id: '123',
                attribution_type: 'post',
                attribution_url: 'url',
                referrer_source: null,
                referrer_medium: null,
                referrer_url: null
            });
            sinon.assert.calledTwice(subscribeSpy);
        });
    });
});
