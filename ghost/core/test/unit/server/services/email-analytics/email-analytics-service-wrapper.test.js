const sinon = require('sinon');
const metrics = require('@tryghost/metrics');

const configUtils = require('../../../../utils/config-utils');
const EmailAnalyticsServiceWrapper = require('../../../../../core/server/services/email-analytics/email-analytics-service-wrapper');

describe('EmailAnalyticsServiceWrapper', function () {
    let metricStub;

    beforeEach(function () {
        configUtils.set('emailAnalytics:metrics:openThroughput:enabled', true);
        configUtils.set('emailAnalytics:metrics:openThroughput:threshold', 0);
        metricStub = sinon.stub(metrics, 'metric');
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    function logLatestOpenedJob(logName) {
        const wrapper = new EmailAnalyticsServiceWrapper({logName});
        wrapper._logJobCompletion('latest-opened', {
            eventCount: 10,
            apiPollingTimeMs: 500,
            processingTimeMs: 1000,
            aggregationTimeMs: 500,
            emailAggregationTimeMs: 300,
            memberAggregationTimeMs: 200,
            result: {
                opened: 10,
                delivered: 0,
                permanentFailed: 0,
                temporaryFailed: 0,
                unprocessable: 0
            }
        }, 2000);
    }

    it('uses existing open throughput metric name for newsletters', function () {
        logLatestOpenedJob('newsletters');

        sinon.assert.calledOnceWithExactly(metricStub, 'email-analytics-open-throughput', {
            value: 5,
            events: 10,
            duration: 2000
        });
    });

    it('uses pipeline-specific open throughput metric name for automations', function () {
        logLatestOpenedJob('automations');

        sinon.assert.calledOnceWithExactly(metricStub, 'email-automations-analytics-open-throughput', {
            value: 5,
            events: 10,
            duration: 2000
        });
    });
});
