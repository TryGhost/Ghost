// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const {MemberCreatedEvent, SubscriptionCreatedEvent, SubscriptionAttributionEvent} = require('@tryghost/member-events');
const EventStorage = require('../lib/EventStorage');

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
            sinon.assert.calledThrice(subscribeSpy);
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
            sinon.assert.calledThrice(subscribeSpy);
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
            sinon.assert.calledThrice(subscribeSpy);
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
            sinon.assert.calledThrice(subscribeSpy);
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
            sinon.assert.calledThrice(subscribeSpy);
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
            sinon.assert.calledThrice(subscribeSpy);
        });
    });

    describe('SubscriptionAttributionEvent handling', function () {
        let DomainEvents, saveStub, SubscriptionCreatedEventModel, eventHandler, subscribeSpy, handlerCallback;

        beforeEach(function () {
            saveStub = sinon.stub().resolves();
            DomainEvents = {
                subscribe: (type, handler) => {
                    if (type === SubscriptionAttributionEvent) {
                        handlerCallback = handler;
                    }
                }
            };
            subscribeSpy = sinon.spy(DomainEvents, 'subscribe');
            SubscriptionCreatedEventModel = {
                findOne: sinon.stub()
            };
            eventHandler = new EventStorage({
                models: {SubscriptionCreatedEvent: SubscriptionCreatedEventModel}
            });
        });

        it('updates the attribution', async function () {
            const toJSONStub = sinon.stub().returns({
                attribution_id: null,
                attribution_type: null,
                attribution_url: null,
                referrer_source: null,
                referrer_medium: null,
                referrer_url: null
            });
            SubscriptionCreatedEventModel.findOne.resolves({id: '123', toJSON: toJSONStub, save: saveStub});

            eventHandler.subscribe(DomainEvents);
            await handlerCallback(SubscriptionAttributionEvent.create({
                memberId: '123',
                subscriptionId: '456',
                attribution: {id: '123', type: 'post', url: 'url'}
            }, new Date(0)));

            sinon.assert.calledOnceWithMatch(SubscriptionCreatedEventModel.findOne, {subscription_id: '456'});
            sinon.assert.calledOnceWithMatch(saveStub, {
                attribution_id: '123',
                attribution_type: 'post',
                attribution_url: 'url',
                referrer_source: 'source',
                referrer_medium: 'referral',
                referrer_url: 'https://ghost.org'
            }, {patch: true});
            sinon.assert.calledThrice(subscribeSpy);
        });

        it('does not update if the subscription is not found', async function () {
            SubscriptionCreatedEventModel.findOne.resolves(null);
            eventHandler.subscribe(DomainEvents);
            await handlerCallback(SubscriptionAttributionEvent.create({
                memberId: '123',
                subscriptionId: '456',
                attribution: {id: '123', type: 'post', url: 'url'}
            }, new Date(0)));
            sinon.assert.notCalled(saveStub);
        });
    });
});
