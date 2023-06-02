const assert = require('assert');
const sinon = require('sinon');

// To test
const ModelEventsAnalytics = require('../../../../../core/server/services/segment/ModelEventsAnalytics');

// Stubbed dependencies
const logging = require('@tryghost/logging');

describe('ModelEventsAnalytics', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new ModelEventsAnalytics({});
        });
    });

    describe('Model events analytics service', function () {
        let modelEventsAnalytics;
        let analyticsStub;
        let sentryStub;
        let loggingStub;

        beforeEach(function () {
            analyticsStub = sinon.stub();
            sentryStub = sinon.stub();
            loggingStub = sinon.stub(logging, 'error');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('subscribes to events', async function () {
            modelEventsAnalytics = new ModelEventsAnalytics({
                analytics: analyticsStub,
                trackDefaults: {
                    userId: '1234',
                    properties: {email: 'john@test.com'}
                },
                prefix: 'Pro: ',
                sentry: {
                    captureException: sentryStub
                }
            });

            modelEventsAnalytics.subscribeToModelEvents();
            assert(loggingStub.callCount === 0);
        });

        it('handles milestone created event for 100 members', async function () {
            modelEventsAnalytics = new ModelEventsAnalytics({
                analytics: {
                    track: analyticsStub
                },
                trackDefaults: {
                    userId: '1234',
                    properties: {email: 'john@test.com'}
                },
                prefix: 'Pro: ',
                sentry: {
                    captureException: sentryStub
                }
            });

            modelEventsAnalytics.subscribeToModelEvents();

            assert(analyticsStub.callCount === 1);
            assert(analyticsStub.calledWith({
                userId: '1234',
                properties: {email: 'john@test.com'},
                event: 'Pro: 100 members reached'
            }));
        });

        it('handles milestone created event for $100 ARR', async function () {
            modelEventsAnalytics = new ModelEventsAnalytics({
                analytics: {
                    track: analyticsStub
                },
                trackDefaults: {
                    userId: '9876',
                    properties: {email: 'john+arr@test.com'}
                },
                prefix: 'Pro: ',
                sentry: {
                    captureException: sentryStub
                }
            });

            modelEventsAnalytics.subscribeToModelEvents();
        });

        it('can handle tracking errors', async function () {
            let error = new Error('Test error');
            modelEventsAnalytics = new ModelEventsAnalytics({
                analytics: {
                    track: analyticsStub.throws(error)
                },
                trackDefaults: {},
                prefix: '',
                sentry: {
                    captureException: sentryStub
                }
            });

            modelEventsAnalytics.subscribeToModelEvents();
    });
});
