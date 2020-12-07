const mailgunJs = require('mailgun-js');
const moment = require('moment');
const EventProcessingResult = require('../lib/event-processing-result');

const EVENT_FILTER = 'delivered OR opened OR failed OR unsubscribed OR complained';
const PAGE_LIMIT = 300;
const TRUST_THRESHOLD_S = 30 * 60; // 30 minutes
const DEFAULT_TAGS = ['bulk-email'];

class EmailAnalyticsMailgunProvider {
    constructor({config, settings, mailgun, logging = console}) {
        this.config = config;
        this.settings = settings;
        this.logging = logging;
        this.tags = [...DEFAULT_TAGS];
        this._mailgun = mailgun;

        if (this.config.get('bulkEmail:mailgun:tag')) {
            this.tags.push(this.config.get('bulkEmail:mailgun:tag'));
        }
    }

    // unless an instance is passed in to the constructor, generate a new instance each
    // time the getter is called to account for changes in config/settings over time
    get mailgun() {
        if (this._mailgun) {
            return this._mailgun;
        }

        const bulkEmailConfig = this.config.get('bulkEmail');
        const bulkEmailSetting = {
            apiKey: this.settings.get('mailgun_api_key'),
            domain: this.settings.get('mailgun_domain'),
            baseUrl: this.settings.get('mailgun_base_url')
        };
        const hasMailgunConfig = !!(bulkEmailConfig && bulkEmailConfig.mailgun);
        const hasMailgunSetting = !!(bulkEmailSetting && bulkEmailSetting.apiKey && bulkEmailSetting.baseUrl && bulkEmailSetting.domain);

        if (!hasMailgunConfig && !hasMailgunSetting) {
            this.logging.warn(`Bulk email service is not configured`);
            return undefined;
        }

        const mailgunConfig = hasMailgunConfig ? bulkEmailConfig.mailgun : bulkEmailSetting;
        const baseUrl = new URL(mailgunConfig.baseUrl);

        return mailgunJs({
            apiKey: mailgunConfig.apiKey,
            domain: mailgunConfig.domain,
            protocol: baseUrl.protocol,
            host: baseUrl.hostname,
            port: baseUrl.port,
            endpoint: baseUrl.pathname,
            retry: 5
        });
    }

    // do not start from a particular time, grab latest then work back through
    // pages until we get a blank response
    fetchAll(batchHandler) {
        const options = {
            event: EVENT_FILTER,
            limit: PAGE_LIMIT,
            tags: this.tags.join(' AND ')
        };

        return this._fetchPages(options, batchHandler);
    }

    // fetch from the last known timestamp-TRUST_THRESHOLD then work forwards
    // through pages until we get a blank response. This lets us get events
    // quicker than the TRUST_THRESHOLD
    fetchLatest(latestTimestamp, batchHandler, options) {
        const beginDate = moment(latestTimestamp).subtract(TRUST_THRESHOLD_S, 's').toDate();

        const mailgunOptions = {
            limit: PAGE_LIMIT,
            event: EVENT_FILTER,
            tags: this.tags.join(' AND '),
            begin: beginDate.toUTCString(),
            ascending: 'yes'
        };

        return this._fetchPages(mailgunOptions, batchHandler, options);
    }

    async _fetchPages(mailgunOptions, batchHandler, {maxEvents = Infinity} = {}) {
        const {mailgun} = this;

        if (!mailgun) {
            this.logging.warn(`Bulk email service is not configured`);
            return new EventProcessingResult();
        }

        const result = new EventProcessingResult();

        let page = await mailgun.events().get(mailgunOptions);
        let events = page && page.items && page.items.map(this.normalizeEvent) || [];

        pagesLoop:
        while (events.length !== 0) {
            const batchResult = await batchHandler(events);
            result.merge(batchResult);

            if (result.totalEvents >= maxEvents) {
                break pagesLoop;
            }

            page = await mailgun.get(page.paging.next.replace('https://api.mailgun.net/v3', ''));
            events = page && page.items && page.items.map(this.normalizeEvent) || [];
        }

        return result;
    }

    normalizeEvent(event) {
        // TODO: clean up the <> surrounding email_batches.provider_id values
        let providerId = event.message && event.message.headers && event.message.headers['message-id'];
        if (providerId) {
            providerId = `<${providerId}>`;
        }

        return {
            type: event.event,
            severity: event.severity,
            recipientEmail: event.recipient,
            emailId: event['user-variables'] && event['user-variables']['email-id'],
            providerId: providerId,
            timestamp: new Date(event.timestamp * 1000)
        };
    }
}

module.exports = EmailAnalyticsMailgunProvider;
