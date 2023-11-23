const _ = require('lodash');
const debug = require('@tryghost/debug');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const errors = require('@tryghost/errors');
const {ServerClient} = require('postmark');

module.exports = class PostmarkClient {
    #config;
    #settings;

    static DEFAULT_BATCH_SIZE = 500;

    constructor({config, settings}) {
        this.#config = config;
        this.#settings = settings;
    }

    /**
     * Creates the data payload and sends to Postmark
     *
     * @param {Object} message
     * @param {Object} recipientData
     * @param {Array<Object>} replacements
     *
     * recipientData format:
     * {
     *     'test@example.com': {
     *         name: 'Test User',
     *         unsubscribe_url: 'https://example.com/unsub/me',
     *         list_unsubscribe: 'https://example.com/unsub/me'
     *     }
     * }
     */
    async send(message, recipientData) {
        const postmarkInstance = this.getInstance();
        if (!postmarkInstance) {
            logging.warn(`Postmark is not configured`);
            return null;
        }

        const batchSize = this.getBatchSize();
        if (Object.keys(recipientData).length > batchSize) {
            throw new errors.IncorrectUsageError({
                message: `Postmark only supports sending to ${batchSize} recipients at a time`
            });
        }

        let emailMessages = [];

        let startTime;
        try {
            const bulkEmailConfig = this.#config.get('bulkEmail');
            const config = this.#getConfig();
            const messageContent = _.pick(message, 'subject', 'html', 'plaintext');

            Object.keys(recipientData).forEach((recipient) => {
                let messageData = {
                    To: recipient,
                    From: message.from,
                    ReplyTo: message.replyTo || message.reply_to,
                    Subject: messageContent.subject,
                    HtmlBody: messageContent.html,
                    TextBody: messageContent.plaintext,
                    Metadata: {},
                    TrackOpens: message.track_opens,
                    Headers: [],
                    MessageStream: config.streamId,
                    Tag: 'ghost-email'
                };

                Object.keys(recipientData[recipient]).forEach((key) => {
                    messageData.HtmlBody = messageData.HtmlBody.replaceAll(`%recipient.${key}%`, recipientData[recipient][key]);
                    messageData.TextBody = messageData.TextBody.replaceAll(`%recipient.${key}%`, recipientData[recipient][key]);
                    messageData.Subject = messageData.Subject.replaceAll(`%recipient.${key}%`, recipientData[recipient][key]);
                });

                // Do we have a custom List-Unsubscribe header set?
                // (we need a variable for this, as this is a per-email setting)
                if (recipientData[recipient].list_unsubscribe) {
                    messageData.Headers['List-Unsubscribe'] = recipientData[recipient].list_unsubscribe;
                    messageData.Headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
                }

                if (message.id) {
                    messageData.Metadata['email-id'] = message.id;
                }

                if (bulkEmailConfig?.mailgun?.tag) {
                    messageData.Tag = bulkEmailConfig.mailgun.tag;
                }

                emailMessages.push(messageData);
            });

            startTime = Date.now();
            const response = await postmarkInstance.sendEmailBatch(emailMessages);

            logging.info(JSON.stringify(response));

            metrics.metric('postmark-send-mail', {
                value: Date.now() - startTime,
                statusCode: 200
            });

            return {
                id: message.id
            };
        } catch (error) {
            logging.error(error);
            metrics.metric('postmark-send-mail', {
                value: Date.now() - startTime,
                statusCode: error.status
            });
            return Promise.reject({error, emailMessages});
        }
    }

    /**
     * @param {ServerClient} postmarkInstance
     * @param {Object} mailgunConfig
     * @param {Object} mailgunOptions
     */
    async getEventsFromMailgun(postmarkInstance, mailgunConfig, mailgunOptions) {
        const startTime = Date.now();
        try {
            const page = await postmarkInstance.events.get(mailgunConfig.domain, mailgunOptions);
            metrics.metric('mailgun-get-events', {
                value: Date.now() - startTime,
                statusCode: 200
            });
            return page;
        } catch (error) {
            metrics.metric('mailgun-get-events', {
                value: Date.now() - startTime,
                statusCode: error.status
            });
            throw error;
        }
    }

    /**
     * Fetches events from Mailgun
     * @param {Object} mailgunOptions
     * @param {Function} batchHandler
     * @param {Object} options
     * @param {Number} options.maxEvents Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     * @returns {Promise<void>}
     */
    async fetchEvents(mailgunOptions, batchHandler, {maxEvents = Infinity} = {}) {
        const mailgunInstance = this.getInstance();
        if (!mailgunInstance) {
            logging.warn(`Mailgun is not configured`);
            return;
        }

        debug(`fetchEvents: starting fetching first events page`);
        const mailgunConfig = this.#getConfig();
        const startDate = new Date();

        try {
            let page = await this.getEventsFromMailgun(mailgunInstance, mailgunConfig, mailgunOptions);

            // By limiting the processed events to ones created before this job started we cancel early ready for the next job run.
            // Avoids chance of events being missed in long job runs due to mailgun's eventual-consistency creating events outside of our 30min sliding re-check window
            let events = (page?.items?.map(this.normalizeEvent) || []).filter(e => !!e && e.timestamp <= startDate);
            debug(`fetchEvents: finished fetching first page with ${events.length} events`);

            let eventCount = 0;
            const beginTimestamp = mailgunOptions.begin ? Math.ceil(mailgunOptions.begin * 1000) : undefined; // ceil here if we have rounding errors

            while (events.length !== 0) {
                await batchHandler(events);
                eventCount += events.length;

                if (eventCount >= maxEvents && (!beginTimestamp || !events[events.length - 1].timestamp || (events[events.length - 1].timestamp.getTime() > beginTimestamp))) {
                    break;
                }

                const nextPageId = page.pages.next.page;
                debug(`fetchEvents: starting fetching next page ${nextPageId}`);
                page = await this.getEventsFromMailgun(mailgunInstance, mailgunConfig, {
                    page: nextPageId,
                    ...mailgunOptions
                });

                // We need to cap events at the time we started fetching them (see comment above)
                events = (page?.items?.map(this.normalizeEvent) || []).filter(e => !!e && e.timestamp <= startDate);
                debug(`fetchEvents: finished fetching next page with ${events.length} events`);
            }
        } catch (error) {
            logging.error(error);
            throw error;
        }
    }

    async removeSuppression(type, email) {
        logging.info(`Removing ${type} suppression for ${email}`);
        if (!this.isConfigured()) {
            return false;
        }
        const instance = this.getInstance();
        const config = this.#getConfig();

        try {
            await instance.deleteSuppressions(config.streamId, {
                Suppressions: [{
                    EmailAddress: email
                }]
            });

            return true;
        } catch (err) {
            logging.error(err);
            return false;
        }
    }

    async removeBounce(email) {
        return this.removeSuppression('bounces', email);
    }

    async removeComplaint(email) {
        return this.removeSuppression('complaints', email);
    }

    async removeUnsubscribe(email) {
        return this.removeSuppression('unsubscribes', email);
    }

    normalizeEvent(event) {
        const providerId = event?.message?.headers['message-id'];

        if (!providerId && !(event['user-variables'] && event['user-variables']['email-id'])) {
            logging.error('Received invalid event from Postmark');
            logging.error(event);
            return null;
        }

        return {
            id: event.id,
            type: event.event,
            severity: event.severity,
            recipientEmail: event.recipient,
            emailId: event['user-variables'] && event['user-variables']['email-id'],
            providerId: providerId,
            timestamp: new Date(event.timestamp * 1000),

            error: event['delivery-status'] && (typeof (event['delivery-status'].message || event['delivery-status'].description) === 'string') ? {
                code: event['delivery-status'].code,
                message: (event['delivery-status'].message || event['delivery-status'].description).substring(0, 2000),
                enhancedCode: event['delivery-status']['enhanced-code']?.toString()?.substring(0, 50) ?? null
            } : null
        };
    }

    #getConfig() {
        const bulkEmailConfig = this.#config.get('bulkEmail');
        const bulkEmailSetting = {
            apiToken: this.#settings.get('postmark_api_token'),
            streamId: this.#settings.get('postmark_stream_id') ?? 'outbound'
        };

        const hasPostmarkConfig = !!(bulkEmailConfig?.postmark);
        const hasPostmarkSetting = !!(bulkEmailSetting && bulkEmailSetting.apiToken);

        if (!hasPostmarkConfig && !hasPostmarkSetting) {
            return null;
        }

        const postmarkConfig = hasPostmarkConfig ? bulkEmailConfig.postmark : bulkEmailSetting;
        return postmarkConfig;
    }

    /**
     * Returns an instance of the Postmark client based upon the config or settings values
     *
     * We don't cache the instance so we can always get a fresh one based upon changed settings
     * or config values over time
     *
     * Note: if the credentials are not configure, this method returns `null` and it is down to the
     * consumer to act upon this/log this out
     *
     * @returns {ServerClient|null} the Postmark client instance
     */
    getInstance() {
        const postmarkConfig = this.#getConfig();
        if (!postmarkConfig) {
            return null;
        }

        return new ServerClient(postmarkConfig.apiToken);
    }

    /**
     * Returns whether the Mailgun instance is configured via config/settings
     *
     * @returns {boolean}
     */
    isConfigured() {
        const instance = this.getInstance();
        return !!instance;
    }

    /**
     * Returns configured batch size
     *
     * @returns {number}
     */
    getBatchSize() {
        return this.#config.get('bulkEmail')?.batchSize ?? this.DEFAULT_BATCH_SIZE;
    }
};
