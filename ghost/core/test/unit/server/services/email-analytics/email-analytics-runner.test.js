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
            getLastOpenedEventTimestamp: sinon.stub(),
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
});
