const assert = require('node:assert/strict');
const Module = require('module');

const sinon = require('sinon');

const EmailAnalyticsServiceWrapper = require('../../../../../core/server/services/email-analytics/email-analytics-service-wrapper');

function createWrapper() {
    const wrapper = new EmailAnalyticsServiceWrapper();

    wrapper.service = {
        restoreScheduled: sinon.stub().resolves()
    };

    return wrapper;
}

describe('EmailAnalyticsServiceWrapper', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('startFetch', function () {
        it('fetches opened events, non-opened events, missing events, then scheduled events', async function () {
            const wrapper = createWrapper();
            const calls = [];

            wrapper._fetchLatestOpenedEventsResult = sinon.stub().callsFake(async (options) => {
                calls.push(['opened', options]);
                return {eventCount: 3};
            });
            wrapper._fetchLatestNonOpenedEventsResult = sinon.stub().callsFake(async (options) => {
                calls.push(['non-opened', options]);
                return {eventCount: 5};
            });
            wrapper._fetchMissingResult = sinon.stub().callsFake(async (options) => {
                calls.push(['missing', options]);
                return {eventCount: 7};
            });
            wrapper._fetchScheduledResult = sinon.stub().callsFake(async (options) => {
                calls.push(['scheduled', options]);
                return {eventCount: 0};
            });

            await wrapper.startFetch();

            assert.deepEqual(calls, [
                ['opened', {maxEvents: 10000}],
                ['non-opened', {maxEvents: 9997}],
                ['missing', {maxEvents: 9992}],
                ['scheduled', {maxEvents: 10000}]
            ]);
            sinon.assert.calledOnce(wrapper.service.restoreScheduled);
        });

        it('restarts without fetching non-opened events when opened events hit the event budget', async function () {
            const wrapper = createWrapper();

            wrapper._fetchLatestOpenedEventsResult = sinon.stub().resolves({eventCount: 10000});
            wrapper._fetchLatestNonOpenedEventsResult = sinon.stub().resolves({eventCount: 0});
            wrapper._fetchMissingResult = sinon.stub().resolves({eventCount: 0});
            wrapper._fetchScheduledResult = sinon.stub().resolves({eventCount: 0});
            wrapper._restartFetch = sinon.stub();

            await wrapper.startFetch();

            sinon.assert.calledOnceWithExactly(wrapper._fetchLatestOpenedEventsResult, {maxEvents: 10000});
            sinon.assert.notCalled(wrapper._fetchLatestNonOpenedEventsResult);
            sinon.assert.notCalled(wrapper._fetchMissingResult);
            sinon.assert.notCalled(wrapper._fetchScheduledResult);
            sinon.assert.calledOnceWithExactly(wrapper._restartFetch, 'high opened event count');
        });

        it('does not run overlapping fetches', async function () {
            const wrapper = createWrapper();
            let resolveOpenedEvents;
            const openedEvents = new Promise((resolve) => {
                resolveOpenedEvents = resolve;
            });

            wrapper._fetchLatestOpenedEventsResult = sinon.stub().returns(openedEvents);
            wrapper._fetchLatestNonOpenedEventsResult = sinon.stub().resolves({eventCount: 0});
            wrapper._fetchMissingResult = sinon.stub().resolves({eventCount: 0});
            wrapper._fetchScheduledResult = sinon.stub().resolves({eventCount: 0});

            const firstFetch = wrapper.startFetch();
            await Promise.resolve();
            await Promise.resolve();

            const secondFetch = wrapper.startFetch();
            await secondFetch;

            sinon.assert.calledOnce(wrapper._fetchLatestOpenedEventsResult);

            resolveOpenedEvents({eventCount: 0});
            await firstFetch;

            sinon.assert.calledOnce(wrapper._fetchLatestOpenedEventsResult);
            sinon.assert.calledOnce(wrapper._fetchLatestNonOpenedEventsResult);
            sinon.assert.calledOnce(wrapper._fetchMissingResult);
            sinon.assert.calledOnce(wrapper._fetchScheduledResult);
        });

        it('does not run scheduled fetches when latest and missing events exceed the event budget', async function () {
            const wrapper = createWrapper();

            wrapper._fetchLatestOpenedEventsResult = sinon.stub().resolves({eventCount: 4000});
            wrapper._fetchLatestNonOpenedEventsResult = sinon.stub().resolves({eventCount: 4000});
            wrapper._fetchMissingResult = sinon.stub().resolves({eventCount: 2001});
            wrapper._fetchScheduledResult = sinon.stub().resolves({eventCount: 0});
            wrapper._restartFetch = sinon.stub();

            await wrapper.startFetch();

            sinon.assert.calledOnceWithExactly(wrapper._fetchLatestOpenedEventsResult, {maxEvents: 10000});
            sinon.assert.calledOnceWithExactly(wrapper._fetchLatestNonOpenedEventsResult, {maxEvents: 6000});
            sinon.assert.calledOnceWithExactly(wrapper._fetchMissingResult, {maxEvents: 2000});
            sinon.assert.notCalled(wrapper._fetchScheduledResult);
            sinon.assert.calledOnceWithExactly(wrapper._restartFetch, 'high event count');
        });
    });

    describe('init', function () {
        let originalLoad;

        beforeEach(function () {
            originalLoad = Module._load;
        });

        afterEach(function () {
            Module._load = originalLoad;
        });

        it('initializes newsletter and automation analytics runners independently', async function () {
            class EmailAnalyticsService {}
            class EmailEventStorage {}
            class EmailEventProcessor {}
            class MailgunProvider {}
            class AutomationAnalyticsPipeline {}
            class StartEmailAnalyticsJobEvent {}
            class StartAutomationEmailAnalyticsJobEvent {}

            const subscribedHandlers = new Map();
            const domainEvents = {
                subscribe: sinon.stub().callsFake((event, handler) => {
                    subscribedHandlers.set(event, handler);
                })
            };
            const labs = {
                isSet: sinon.stub().withArgs('automations').returns(true)
            };

            Module._load = function (request, parent, isMain) {
                if (request === './email-analytics-service') {
                    return EmailAnalyticsService;
                }
                if (request === '../email-service/email-event-storage') {
                    return EmailEventStorage;
                }
                if (request === '../email-service/email-event-processor') {
                    return EmailEventProcessor;
                }
                if (request === './email-analytics-provider-mailgun') {
                    return MailgunProvider;
                }
                if (request === './automation/automation-analytics-pipeline') {
                    return AutomationAnalyticsPipeline;
                }
                if (request === './events/start-email-analytics-job-event') {
                    return StartEmailAnalyticsJobEvent;
                }
                if (request === './events/start-automation-email-analytics-job-event') {
                    return StartAutomationEmailAnalyticsJobEvent;
                }
                if (request === '@tryghost/domain-events') {
                    return domainEvents;
                }
                if (request === '../../../shared/labs') {
                    return labs;
                }
                if (request === '../../models') {
                    return {};
                }
                if (request === '../members') {
                    return {
                        api: {
                            members: {}
                        }
                    };
                }
                if ([
                    '../../../shared/settings-cache',
                    '../../data/db',
                    './lib/queries',
                    '../email-suppression-list',
                    '../../../shared/prometheus-client'
                ].includes(request)) {
                    return {};
                }

                return originalLoad.call(this, request, parent, isMain);
            };

            const wrapper = new EmailAnalyticsServiceWrapper();
            const newsletterRunner = {
                start: sinon.stub().resolves()
            };
            const automationRunner = {
                start: sinon.stub().resolves()
            };

            sinon.stub(wrapper, '_getRunner').returns(newsletterRunner);
            sinon.stub(wrapper, '_getAutomationRunner').returns(automationRunner);

            wrapper.init();

            assert.ok(subscribedHandlers.has(StartEmailAnalyticsJobEvent));
            assert.ok(subscribedHandlers.has(StartAutomationEmailAnalyticsJobEvent));

            await subscribedHandlers.get(StartEmailAnalyticsJobEvent)();

            sinon.assert.calledOnce(newsletterRunner.start);
            sinon.assert.notCalled(automationRunner.start);

            await subscribedHandlers.get(StartAutomationEmailAnalyticsJobEvent)();

            sinon.assert.calledOnce(newsletterRunner.start);
            sinon.assert.calledOnce(automationRunner.start);
        });
    });
});
