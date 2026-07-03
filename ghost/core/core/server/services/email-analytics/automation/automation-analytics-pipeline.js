const EmailAnalyticsService = require('../email-analytics-service');
const EmailAnalyticsProviderMailgun = require('../email-analytics-provider-mailgun');
const EventProcessingResult = require('../event-processing-result');
const AutomationEventProcessor = require('./automation-event-processor');

const AUTOMATION_FETCH_JOB_NAMES = {
    latestOpenedJobName: 'email-analytics-automation-latest-opened',
    latestNonOpenedJobName: 'email-analytics-automation-latest-others',
    missingJobName: 'email-analytics-automation-missing'
};

const AUTOMATION_FETCH_EVENT_TYPES = {
    latestOpened: ['opened'],
    latestNonOpened: ['delivered'],
    latestNonOpenedTimestamp: ['delivered'],
    missing: ['opened', 'delivered']
};

class AutomationAnalyticsPipeline {
    name = 'automation';

    constructor({
        config,
        settings,
        labs,
        queries,
        db,
        processor,
        Provider = EmailAnalyticsProviderMailgun
    }) {
        this.processor = processor || new AutomationEventProcessor({db});
        this.service = new EmailAnalyticsService({
            config,
            settings,
            queries,
            providers: [
                new Provider({
                    config,
                    settings,
                    labs,
                    tags: ['automation-email']
                })
            ],
            fetchJobNames: AUTOMATION_FETCH_JOB_NAMES,
            fetchEventTypes: AUTOMATION_FETCH_EVENT_TYPES,
            eventBatchProcessor: async (events, result, fetchData) => {
                await this.processEventBatch(events, result, fetchData);
            }
        });
    }

    async getLastOpenedEventTimestamp() {
        return await this.service.getLastOpenedEventTimestamp();
    }

    async fetchLatestOpenedEvents(options) {
        return await this.service.fetchLatestOpenedEvents(options);
    }

    async fetchLatestNonOpenedEvents(options) {
        return await this.service.fetchLatestNonOpenedEvents(options);
    }

    async fetchMissing(options) {
        return await this.service.fetchMissing(options);
    }

    async processEventBatch(events, result, fetchData) {
        const processingResult = await this.processor.processEvents(events);

        for (const event of events) {
            if (!fetchData.lastEventTimestamp || (event.timestamp && event.timestamp > fetchData.lastEventTimestamp)) {
                fetchData.lastEventTimestamp = event.timestamp;
            }
        }

        result.merge(new EventProcessingResult(processingResult));
    }
}

module.exports = AutomationAnalyticsPipeline;
