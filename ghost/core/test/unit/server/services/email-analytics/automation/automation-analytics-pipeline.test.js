const assert = require('node:assert/strict');

const sinon = require('sinon');

const AutomationAnalyticsPipeline = require('../../../../../../core/server/services/email-analytics/automation/automation-analytics-pipeline');

describe('AutomationAnalyticsPipeline', function () {
    let clock;

    beforeEach(function () {
        clock = sinon.useFakeTimers(new Date('2026-07-03T17:00:00.000Z'));
    });

    afterEach(function () {
        clock.restore();
        sinon.restore();
    });

    it('fetches automation opened, delivered, and missing events with automation tags and cursors', async function () {
        const providerCalls = [];
        const queryCalls = [];
        const processor = {
            processEvents: sinon.stub().resolves({
                opened: 0,
                delivered: 0
            })
        };
        const queries = {
            getLastEventTimestamp: sinon.stub().callsFake(async (jobName, events) => {
                queryCalls.push(['getLastEventTimestamp', jobName, events]);
                return new Date('2026-07-03T16:00:00.000Z');
            }),
            getLastJobRunTimestamp: sinon.stub().callsFake(async (jobName) => {
                queryCalls.push(['getLastJobRunTimestamp', jobName]);
                return new Date('2026-07-03T15:00:00.000Z');
            }),
            setJobTimestamp: sinon.stub().resolves(),
            setJobStatus: sinon.stub().resolves()
        };
        const config = {
            get: sinon.stub().returns(false)
        };
        class Provider {
            constructor({tags}) {
                this.tags = tags;
            }

            async fetchLatest(batchHandler, options) {
                providerCalls.push({
                    tags: this.tags,
                    events: options.events
                });
                await batchHandler([]);
            }
        }
        const pipeline = new AutomationAnalyticsPipeline({
            config,
            settings: {},
            labs: {},
            queries,
            processor,
            Provider
        });

        await pipeline.fetchLatestOpenedEvents();
        await pipeline.fetchLatestNonOpenedEvents();
        await pipeline.fetchMissing();

        assert.equal(pipeline.name, 'automation');
        assert.deepEqual(providerCalls, [{
            tags: ['automation-email'],
            events: ['opened']
        }, {
            tags: ['automation-email'],
            events: ['delivered']
        }, {
            tags: ['automation-email'],
            events: ['opened', 'delivered']
        }]);
        assert.deepEqual(queryCalls, [
            ['getLastEventTimestamp', 'email-analytics-automation-latest-opened', ['opened']],
            ['getLastEventTimestamp', 'email-analytics-automation-latest-others', ['delivered']],
            ['getLastJobRunTimestamp', 'email-analytics-automation-missing']
        ]);
        assert.equal(pipeline.fetchScheduled, undefined);
    });
});
