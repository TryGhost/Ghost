const assert = require('assert/strict');
const sinon = require('sinon');
const ObjectId = require('bson-objectid').default;

// To test
const DomainEventsAnalytics = require('../../../../../core/server/services/segment/DomainEventsAnalytics');

// Stubbed dependencies
const DomainEvents = require('@tryghost/domain-events');
const {MilestoneCreatedEvent} = require('@tryghost/milestones');
const {StripeLiveEnabledEvent, StripeLiveDisabledEvent} = require('@tryghost/members-stripe-service').events;

describe('DomainEventsAnalytics', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new DomainEventsAnalytics({});
        });
    });

    describe('Domain events analytics service', function () {
        let domainEventsAnalytics;
        let analyticsStub;
        let exceptionHandlerStub;
        let loggingStub;
        let domainEventsStub;

        beforeEach(function () {
            analyticsStub = sinon.stub();
            exceptionHandlerStub = sinon.stub();
            loggingStub = sinon.stub();
            domainEventsStub = sinon.stub();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('subscribes to events', async function () {
            domainEventsAnalytics = new DomainEventsAnalytics({
                analytics: analyticsStub,
                trackDefaults: {
                    userId: '1234',
                    properties: {email: 'john@test.com'}
                },
                prefix: 'Pro: ',
                exceptionHandler: {
                    captureException: exceptionHandlerStub
                },
                DomainEvents: {
                    subscribe: domainEventsStub
                },
                logging: {
                    error: loggingStub
                }
            });

            domainEventsAnalytics.subscribeToEvents();
            assert(domainEventsStub.callCount === 3);
            assert(loggingStub.callCount === 0);
        });

        it('handles milestone created event for 100 members', async function () {
            domainEventsAnalytics = new DomainEventsAnalytics({
                analytics: {
                    track: analyticsStub
                },
                trackDefaults: {
                    userId: '1234',
                    properties: {email: 'john@test.com'}
                },
                prefix: 'Pro: ',
                exceptionHandler: {
                    captureException: exceptionHandlerStub
                },
                DomainEvents,
                logging: {
                    error: loggingStub
                }
            });

            domainEventsAnalytics.subscribeToEvents();

            DomainEvents.dispatch(MilestoneCreatedEvent.create({
                milestone: {
                    id: new ObjectId().toHexString(),
                    type: 'members',
                    value: 100,
                    createdAt: new Date(),
                    emailSentAt: new Date()
                }
            }));

            await DomainEvents.allSettled();

            assert(analyticsStub.callCount === 1);
            assert(analyticsStub.calledWith({
                userId: '1234',
                properties: {email: 'john@test.com'},
                event: 'Pro: 100 Members reached'
            }));

            DomainEvents.dispatch(MilestoneCreatedEvent.create({
                milestone: {
                    id: new ObjectId().toHexString(),
                    type: 'members',
                    value: 1000,
                    createdAt: new Date(),
                    emailSentAt: new Date()
                }
            }));

            await DomainEvents.allSettled();
            // Analytics should not be called again
            assert(analyticsStub.callCount === 1);
            assert(loggingStub.callCount === 0);
        });

        it('handles milestone created event for $100 ARR', async function () {
            domainEventsAnalytics = new DomainEventsAnalytics({
                analytics: {
                    track: analyticsStub
                },
                trackDefaults: {
                    userId: '9876',
                    properties: {email: 'john+arr@test.com'}
                },
                prefix: 'Pro: ',
                exceptionHandler: {
                    captureException: exceptionHandlerStub
                },
                DomainEvents,
                logging: {
                    error: loggingStub
                }
            });

            domainEventsAnalytics.subscribeToEvents();

            DomainEvents.dispatch(MilestoneCreatedEvent.create({
                milestone: {
                    id: new ObjectId().toHexString(),
                    type: 'arr',
                    currency: 'usd',
                    value: 100,
                    createdAt: new Date(),
                    emailSentAt: new Date()
                }
            }));

            await DomainEvents.allSettled();

            assert(analyticsStub.callCount === 1);
            assert(analyticsStub.calledWith({
                userId: '9876',
                properties: {email: 'john+arr@test.com'},
                event: 'Pro: $100 ARR reached'
            }));
            assert(loggingStub.callCount === 0);

            DomainEvents.dispatch(MilestoneCreatedEvent.create({
                milestone: {
                    id: new ObjectId().toHexString(),
                    type: 'arr',
                    currency: 'usd',
                    value: 1000,
                    createdAt: new Date(),
                    emailSentAt: new Date()
                }
            }));

            await DomainEvents.allSettled();
            // Analytics should not be called again
            assert(analyticsStub.callCount === 1);
            assert(loggingStub.callCount === 0);
        });

        it('handles Stripe live enabled and disabled events', async function () {
            domainEventsAnalytics = new DomainEventsAnalytics({
                analytics: {
                    track: analyticsStub
                },
                trackDefaults: {
                    userId: '9876',
                    properties: {email: 'john+stripe@test.com'}
                },
                prefix: 'Pro: ',
                exceptionHandler: {
                    captureException: exceptionHandlerStub
                },
                DomainEvents,
                logging: {
                    error: loggingStub
                }
            });

            domainEventsAnalytics.subscribeToEvents();

            DomainEvents.dispatch(StripeLiveEnabledEvent.create({
                message: 'Stripe live mode enabled'
            }));

            await DomainEvents.allSettled();

            assert(analyticsStub.callCount === 1);
            assert(analyticsStub.getCall(0).calledWith({
                userId: '9876',
                properties: {email: 'john+stripe@test.com'},
                event: 'Pro: Stripe Live Enabled'
            }));
            assert(loggingStub.callCount === 0);

            DomainEvents.dispatch(StripeLiveDisabledEvent.create({
                message: 'Stripe live mode disabled'
            }));

            await DomainEvents.allSettled();

            assert(analyticsStub.callCount === 2);
            assert(analyticsStub.getCall(1).calledWith({
                userId: '9876',
                properties: {email: 'john+stripe@test.com'},
                event: 'Pro: Stripe Live Disabled'
            }));

            await DomainEvents.allSettled();

            assert(loggingStub.callCount === 0);
        });

        it('can handle tracking errors', async function () {
            let error = new Error('Test error');
            domainEventsAnalytics = new DomainEventsAnalytics({
                analytics: {
                    track: analyticsStub.throws(error)
                },
                trackDefaults: {},
                prefix: '',
                exceptionHandler: {
                    captureException: exceptionHandlerStub
                },
                DomainEvents,
                logging: {
                    error: loggingStub
                }
            });

            domainEventsAnalytics.subscribeToEvents();

            try {
                DomainEvents.dispatch(MilestoneCreatedEvent.create({
                    milestone: {
                        id: new ObjectId().toHexString(),
                        type: 'arr',
                        currency: 'usd',
                        value: 100,
                        createdAt: new Date(),
                        emailSentAt: new Date()
                    }
                }));

                await DomainEvents.allSettled();
            } catch (err) {
                assert(analyticsStub.callCount === 1);
                assert(exceptionHandlerStub.callCount === 1);
                assert(exceptionHandlerStub.calledWith(error));
                assert(loggingStub.callCount === 1);
            }
        });
    });
});
