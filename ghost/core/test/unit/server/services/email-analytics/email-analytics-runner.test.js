const assert = require('node:assert/strict');

const sinon = require('sinon');

const EmailAnalyticsRunner = require('../../../../../core/server/services/email-analytics/runner/email-analytics-runner');

describe('EmailAnalyticsRunner', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('fetches opened events, non-opened events, missing events, then scheduled events', async function () {
        const calls = [];
        const adapter = {
            name: 'newsletter',
            restoreScheduled: sinon.stub().callsFake(async () => {
                calls.push(['restoreScheduled']);
            }),
            fetchLatestOpenedEvents: sinon.stub().callsFake(async (options) => {
                calls.push(['opened', options]);
                return 3;
            }),
            fetchLatestNonOpenedEvents: sinon.stub().callsFake(async (options) => {
                calls.push(['non-opened', options]);
                return 5;
            }),
            fetchMissing: sinon.stub().callsFake(async (options) => {
                calls.push(['missing', options]);
                return 7;
            }),
            fetchScheduled: sinon.stub().callsFake(async (options) => {
                calls.push(['scheduled', options]);
                return 0;
            })
        };
        const runner = new EmailAnalyticsRunner({adapter});

        await runner.start();

        assert.deepEqual(calls, [
            ['restoreScheduled'],
            ['opened', {maxEvents: 10000}],
            ['non-opened', {maxEvents: 9997}],
            ['missing', {maxEvents: 9992}],
            ['scheduled', {maxEvents: 10000}]
        ]);
    });

    it('logs non-empty fetch completion with pipeline name, job type, and event count', async function () {
        const logging = {
            info: sinon.stub(),
            error: sinon.stub()
        };
        const adapter = {
            name: 'newsletter',
            fetchLatestOpenedEvents: sinon.stub().resolves({
                eventCount: 2,
                apiPollingTimeMs: 100,
                processingTimeMs: 50,
                aggregationTimeMs: 25,
                emailAggregationTimeMs: 10,
                memberAggregationTimeMs: 15,
                result: {
                    opened: 2,
                    delivered: 0,
                    permanentFailed: 0,
                    temporaryFailed: 0,
                    unprocessable: 0
                }
            }),
            fetchLatestNonOpenedEvents: sinon.stub().resolves(0),
            fetchMissing: sinon.stub().resolves(0),
            fetchScheduled: sinon.stub().resolves(0)
        };
        const runner = new EmailAnalyticsRunner({
            adapter,
            logging,
            config: {
                get: sinon.stub().returns(false)
            },
            metrics: {
                metric: sinon.stub()
            }
        });

        await runner.start();

        sinon.assert.calledWithMatch(logging.info, sinon.match((message) => {
            return message.includes('Pipeline: newsletter') &&
                message.includes('Job complete: latest-opened') &&
                message.includes('2 events') &&
                message.includes('Events: opened=2 delivered=0 failed=0 unprocessable=0');
        }));
    });

    it('logs automation fetch completion timings and no-op counts when available', async function () {
        const logging = {
            info: sinon.stub(),
            error: sinon.stub()
        };
        const adapter = {
            name: 'automation',
            fetchLatestOpenedEvents: sinon.stub().resolves({
                eventCount: 4,
                apiPollingTimeMs: 100,
                processingTimeMs: 50,
                aggregationTimeMs: 25,
                emailAggregationTimeMs: 0,
                memberAggregationTimeMs: 10,
                result: {
                    opened: 1,
                    delivered: 1,
                    noop: 2
                }
            }),
            fetchLatestNonOpenedEvents: sinon.stub().resolves(0),
            fetchMissing: sinon.stub().resolves(0)
        };
        const runner = new EmailAnalyticsRunner({
            adapter,
            logging,
            config: {
                get: sinon.stub().returns(false)
            },
            metrics: {
                metric: sinon.stub()
            }
        });

        await runner.start();

        sinon.assert.calledWithMatch(logging.info, sinon.match((message) => {
            return message.includes('Pipeline: automation') &&
                message.includes('Job complete: latest-opened') &&
                message.includes('4 events') &&
                message.includes('Timings: API 0.1s') &&
                message.includes('Processing 0.1s') &&
                message.includes('Aggregation 0.0s') &&
                message.includes('Events: opened=1 delivered=1 noop=2');
        }));
    });
});
