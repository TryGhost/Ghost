const assert = require('assert/strict');
const sinon = require('sinon');

// To test
const ModelEventsAnalytics = require('../../../../../core/server/services/segment/ModelEventsAnalytics');

// Stubbed dependencies
const events = require('../../../../../core/server/lib/common/events');

describe('ModelEventsAnalytics', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new ModelEventsAnalytics({});
        });
    });

    describe('Model events analytics service', function () {
        let modelEventsAnalytics;
        let analyticsStub;
        let exceptionHandlerStub;
        let loggingStub;
        let eventStub;

        beforeEach(function () {
            analyticsStub = sinon.stub();
            exceptionHandlerStub = sinon.stub();
            loggingStub = sinon.stub();
            eventStub = sinon.stub();
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
                exceptionHandler: {
                    captureException: exceptionHandlerStub
                },
                events: {
                    on: eventStub
                },
                logging: {
                    error: loggingStub
                }
            });

            modelEventsAnalytics.subscribeToEvents();

            assert(eventStub.callCount === 4);
            assert(loggingStub.callCount === 0);
        });

        it('handles common model events', async function () {
            modelEventsAnalytics = new ModelEventsAnalytics({
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
                events,
                logging: {
                    error: loggingStub
                }
            });

            modelEventsAnalytics.subscribeToEvents();

            events.emit('theme.uploaded', {name: 'Custom Super Theme'});
            events.emit('post.published');
            events.emit('page.published');
            events.emit('integration.added');

            assert(analyticsStub.callCount === 4);
            assert(analyticsStub.getCall(0).calledWithExactly({
                userId: '1234',
                properties: {email: 'john@test.com'},
                event: 'Pro: Theme Uploaded',
                name: 'Custom Super Theme'
            }));

            assert(analyticsStub.getCall(1).calledWithExactly({
                userId: '1234',
                properties: {email: 'john@test.com'},
                event: 'Pro: Post Published'
            }));

            assert(analyticsStub.getCall(2).calledWithExactly({
                userId: '1234',
                properties: {email: 'john@test.com'},
                event: 'Pro: Page Published'
            }));

            assert(analyticsStub.getCall(3).calledWithExactly({
                userId: '1234',
                properties: {email: 'john@test.com'},
                event: 'Pro: Custom Integration Added'
            }));

            events.emit('post.unpublished');

            // Analytics should not be called again
            assert(analyticsStub.callCount === 4);
            assert(loggingStub.callCount === 0);
        });

        it('can handle tracking errors', async function () {
            let error = new Error('Test error');
            modelEventsAnalytics = new ModelEventsAnalytics({
                analytics: {
                    track: analyticsStub.throws(error)
                },
                trackDefaults: {},
                prefix: '',
                exceptionHandler: {
                    captureException: exceptionHandlerStub
                },
                events,
                logging: {
                    error: loggingStub
                }
            });

            modelEventsAnalytics.subscribeToEvents();

            try {
                events.emit('post.published');
            } catch (err) {
                assert(analyticsStub.callCount === 1);
                assert(exceptionHandlerStub.callCount === 1);
                assert(exceptionHandlerStub.calledWith(error));
                assert(loggingStub.callCount === 1);
            }
        });
    });
});
