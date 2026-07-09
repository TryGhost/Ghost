const assert = require('node:assert/strict');
const sinon = require('sinon');

const config = require('../../../../../core/shared/config');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const EmailAnalyticsServiceWrapper = require('../../../../../core/server/services/email-analytics/email-analytics-service-wrapper');

function createWrapper(logName) {
    return new EmailAnalyticsServiceWrapper({
        logName,
        mailgunTags: [],
        jobNames: {},
        processEventBatch: sinon.stub(),
        flush: sinon.stub()
    });
}

function createFetchResult(eventCount = 1) {
    return {
        eventCount,
        apiPollingTimeMs: 0,
        processingTimeMs: 0,
        aggregationTimeMs: 0,
        emailAggregationTimeMs: 0,
        memberAggregationTimeMs: 0,
        result: {
            opened: eventCount,
            delivered: 0,
            permanentFailed: 0,
            temporaryFailed: 0,
            unprocessable: 0
        }
    };
}

describe('EmailAnalyticsServiceWrapper', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('separates automation throughput metrics and completion logs', function () {
        const configGet = sinon.stub(config, 'get');
        configGet.withArgs('emailAnalytics:batchProcessing').returns(true);
        configGet.withArgs('emailAnalytics:metrics:openThroughput:enabled').returns(true);
        configGet.withArgs('emailAnalytics:metrics:openThroughput:threshold').returns(0);
        const metric = sinon.stub(metrics, 'metric');
        const info = sinon.stub(logging, 'info');
        const wrapper = createWrapper('automations');

        wrapper._logJobCompletion('latest-opened', createFetchResult(10), 1000);

        sinon.assert.calledOnceWithExactly(metric, 'email-analytics-automations-open-throughput', {
            value: 10,
            events: 10,
            duration: 1000,
            pipeline: 'automations'
        });
        sinon.assert.calledOnceWithMatch(info, sinon.match(/^\[EmailAnalytics:automations\] Job complete: latest-opened/));
    });

    it('keeps existing newsletter throughput metric name', function () {
        const configGet = sinon.stub(config, 'get');
        configGet.withArgs('emailAnalytics:batchProcessing').returns(true);
        configGet.withArgs('emailAnalytics:metrics:openThroughput:enabled').returns(true);
        configGet.withArgs('emailAnalytics:metrics:openThroughput:threshold').returns(0);
        const metric = sinon.stub(metrics, 'metric');
        const wrapper = createWrapper('newsletters');

        wrapper._logJobCompletion('latest-opened', createFetchResult(10), 1000);

        sinon.assert.calledOnceWithExactly(metric, 'email-analytics-open-throughput', {
            value: 10,
            events: 10,
            duration: 1000,
            pipeline: 'newsletters'
        });
    });

    it('tags opened-event lag warnings with pipeline name', async function () {
        const configGet = sinon.stub(config, 'get');
        configGet.withArgs('emailAnalytics:openedJobLagWarningMinutes').returns(5);
        const warn = sinon.stub(logging, 'warn');
        const wrapper = createWrapper('automations');
        wrapper.service = {
            getLastOpenedEventTimestamp: sinon.stub().resolves(new Date(Date.now() - 10 * 60 * 1000)),
            fetchLatestOpenedEvents: sinon.stub().resolves(createFetchResult(0))
        };

        await wrapper.fetchLatestOpenedEvents();

        sinon.assert.calledOnceWithMatch(warn, sinon.match(/^\[EmailAnalytics:automations\] Opened events processing is/));
    });

    describe('_logJobCompletion', function () {
        it('does not log or emit metrics when there are no events', function () {
            const metric = sinon.stub(metrics, 'metric');
            const info = sinon.stub(logging, 'info');
            const wrapper = createWrapper('automations');

            wrapper._logJobCompletion('latest-opened', createFetchResult(0), 1000);

            sinon.assert.notCalled(info);
            sinon.assert.notCalled(metric);
        });

        it('does not emit a throughput metric below the threshold', function () {
            const configGet = sinon.stub(config, 'get');
            configGet.withArgs('emailAnalytics:batchProcessing').returns(true);
            configGet.withArgs('emailAnalytics:metrics:openThroughput:enabled').returns(true);
            configGet.withArgs('emailAnalytics:metrics:openThroughput:threshold').returns(100);
            const metric = sinon.stub(metrics, 'metric');
            sinon.stub(logging, 'info');
            const wrapper = createWrapper('automations');

            wrapper._logJobCompletion('latest-opened', createFetchResult(10), 1000);

            sinon.assert.notCalled(metric);
        });

        it('does not emit a throughput metric when throughput metrics are disabled', function () {
            const configGet = sinon.stub(config, 'get');
            configGet.withArgs('emailAnalytics:batchProcessing').returns(true);
            configGet.withArgs('emailAnalytics:metrics:openThroughput:enabled').returns(false);
            configGet.withArgs('emailAnalytics:metrics:openThroughput:threshold').returns(0);
            const metric = sinon.stub(metrics, 'metric');
            sinon.stub(logging, 'info');
            const wrapper = createWrapper('automations');

            wrapper._logJobCompletion('latest-opened', createFetchResult(10), 1000);

            sinon.assert.notCalled(metric);
        });

        it('does not emit a throughput metric for non-opened job types', function () {
            const configGet = sinon.stub(config, 'get');
            configGet.withArgs('emailAnalytics:batchProcessing').returns(true);
            configGet.withArgs('emailAnalytics:metrics:openThroughput:enabled').returns(true);
            configGet.withArgs('emailAnalytics:metrics:openThroughput:threshold').returns(0);
            const metric = sinon.stub(metrics, 'metric');
            sinon.stub(logging, 'info');
            const wrapper = createWrapper('automations');

            wrapper._logJobCompletion('latest', createFetchResult(10), 1000);

            sinon.assert.notCalled(metric);
        });
    });

    describe('fetchScheduled', function () {
        it('skips the scheduled fetch when maxEvents is below 300', async function () {
            const wrapper = createWrapper('automations');
            const fetchScheduled = sinon.stub().resolves(createFetchResult(1));
            wrapper.service = {fetchScheduled};

            const result = await wrapper.fetchScheduled({maxEvents: 299});

            assert.equal(result, 0);
            sinon.assert.notCalled(fetchScheduled);
        });
    });

    describe('startFetch', function () {
        function createServiceStub(overrides = {}) {
            return {
                restoreScheduled: sinon.stub().resolves(),
                getLastOpenedEventTimestamp: sinon.stub().resolves(new Date()),
                fetchLatestOpenedEvents: sinon.stub().resolves(createFetchResult(0)),
                fetchLatestNonOpenedEvents: sinon.stub().resolves(createFetchResult(0)),
                fetchMissing: sinon.stub().resolves(createFetchResult(0)),
                fetchScheduled: sinon.stub().resolves(createFetchResult(0)),
                ...overrides
            };
        }

        it('skips when a fetch is already running', async function () {
            sinon.stub(config, 'get');
            const info = sinon.stub(logging, 'info');
            const wrapper = createWrapper('automations');
            wrapper.service = createServiceStub();
            wrapper.fetching = true;

            await wrapper.startFetch();

            sinon.assert.calledWithMatch(info, sinon.match(/Fetch already running, skipping/));
            sinon.assert.notCalled(wrapper.service.getLastOpenedEventTimestamp);
        });

        it('logs completion when no events are found', async function () {
            sinon.stub(config, 'get');
            const info = sinon.stub(logging, 'info');
            const wrapper = createWrapper('automations');
            wrapper.service = createServiceStub();

            await wrapper.startFetch();

            sinon.assert.calledWithMatch(info, sinon.match(/Job complete - No events/));
            assert.equal(wrapper.fetching, false);
        });

        it('runs restoreScheduled only once across multiple fetches', async function () {
            sinon.stub(config, 'get');
            sinon.stub(logging, 'info');
            const wrapper = createWrapper('automations');
            wrapper.service = createServiceStub();

            await wrapper.startFetch();
            await wrapper.startFetch();

            sinon.assert.calledOnce(wrapper.service.restoreScheduled);
        });

        it('resets the fetching flag and logs when a fetch throws', async function () {
            sinon.stub(config, 'get');
            sinon.stub(logging, 'info');
            const error = sinon.stub(logging, 'error');
            const wrapper = createWrapper('automations');
            wrapper.service = createServiceStub({
                fetchLatestOpenedEvents: sinon.stub().rejects(new Error('boom'))
            });

            await wrapper.startFetch();

            sinon.assert.called(error);
            assert.equal(wrapper.fetching, false);
        });
    });
});
