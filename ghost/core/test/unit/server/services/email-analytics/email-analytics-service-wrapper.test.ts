import sinon from 'sinon';
import {EmailAnalyticsServiceWrapper} from '../../../../../core/server/services/email-analytics/email-analytics-service-wrapper';
import {EventProcessingResult} from '../../../../../core/server/services/email-analytics/event-processing-result';
import {Queries} from '../../../../../core/server/services/email-analytics/lib/queries';

class FakeEvent {
    timestamp = new Date();
    data = null;
}

describe('EmailAnalyticsServiceWrapper', function () {
    let metricStub: sinon.SinonStub;

    beforeEach(function () {
        metricStub = sinon.stub();
    });

    afterEach(async function () {
        sinon.restore();
    });

    function logLatestOpenedJob(logName: string) {
        const wrapper = new EmailAnalyticsServiceWrapper({logName});
        wrapper.init({
            config: {
                get: (key) => {
                    switch (key) {
                    case 'emailAnalytics:metrics:openThroughput:enabled':
                        return true;
                    case 'emailAnalytics:metrics:openThroughput:threshold':
                        return 0;
                    default:
                        return undefined;
                    }
                }
            },
            domainEvents: {
                subscribe: sinon.stub(),
            },
            event: FakeEvent,
            queries: sinon.createStubInstance(Queries),
            mailgunTags: [],
            jobNames: {
                latestNonOpened: 'email-analytics-latest-others',
                missing: 'email-analytics-missing',
                latestOpened: 'email-analytics-latest-opened',
                scheduled: 'email-analytics-scheduled'
            },
            cursorSeed: {
                tableName: 'email_recipients',
                eventColumns: {
                    delivered: 'delivered_at',
                    opened: 'opened_at',
                    failed: 'failed_at'
                }
            },
            settingsCache: {
                get: sinon.stub()
            },
            createEventProcessor: sinon.stub().returns({
                process: sinon.stub().resolves()
            }),
            metrics: {
                metric: metricStub
            }
        });
        wrapper._logJobCompletion('latest-opened', {
            eventCount: 10,
            apiPollingTimeMs: 500,
            processingTimeMs: 1000,
            aggregationTimeMs: 500,
            emailAggregationTimeMs: 300,
            memberAggregationTimeMs: 200,
            result: new EventProcessingResult()
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
