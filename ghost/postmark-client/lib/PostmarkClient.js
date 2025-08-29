const _ = require('lodash');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const errors = require('@tryghost/errors');
const {ServerClient, Header} = require('postmark');

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
                    Tag: 'ghost-email|' + message.id
                };

                Object.keys(recipientData[recipient]).forEach((key) => {
                    messageData.HtmlBody = messageData.HtmlBody.replaceAll(`%recipient.${key}%`, recipientData[recipient][key]);
                    messageData.TextBody = messageData.TextBody.replaceAll(`%recipient.${key}%`, recipientData[recipient][key]);
                    messageData.Subject = messageData.Subject.replaceAll(`%recipient.${key}%`, recipientData[recipient][key]);
                });

                // Do we have a custom List-Unsubscribe header set?
                // (we need a variable for this, as this is a per-email setting)
                if (recipientData[recipient].list_unsubscribe) {
                    messageData.Headers.push(new Header('List-Unsubscribe', recipientData[recipient].list_unsubscribe));
                    messageData.Headers.push(new Header('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click'));
                }

                if (message.id) {
                    messageData.Metadata['email-id'] = message.id;
                }

                if (bulkEmailConfig?.postmark?.tag) {
                    messageData.Tag = bulkEmailConfig.postmark.tag;
                }

                emailMessages.push(messageData);
            });

            startTime = Date.now();
            const response = await postmarkInstance.sendEmailBatch(emailMessages);
            logging.info(JSON.stringify(response));

            const successCount = response.filter(r => r.ErrorCode === 0).length;
            if (successCount === 0) {
                throw new errors.EmailError({
                    response,
                    code: 'BULK_EMAIL_SEND_FAILED',
                    message: `Error sending email`,
                    context: response
                });
            }
            logging.info(`[POSTMARK] Sent ${successCount} emails to ${Object.keys(recipientData).length} recipients`);

            metrics.metric('postmark-send-mail', {
                value: Date.now() - startTime,
                statusCode: 200
            });

            return {
                id: response[0]?.MessageID ?? 'no-postmark-message-id'
            };
        } catch (error) {
            logging.error(error);
            metrics.metric('postmark-send-mail', {
                value: Date.now() - startTime,
                statusCode: error.code
            });
            return Promise.reject({error, emailMessages});
        }
    }

    /**
     * @param {ServerClient} postmarkInstance
     * @param {Date} startTime
     * @param {number} offset - The offset for pagination
     */
    async getEventsFromPostmark(postmarkInstance, startTime, offset = 0) {
        try {
            const page = await postmarkInstance.getMessageOpens({offset});
            metrics.metric('postmark-get-events', {
                value: Date.now() - startTime,
                statusCode: 200
            });
            return page;
        } catch (error) {
            metrics.metric('postmark-get-events', {
                value: Date.now() - startTime,
                statusCode: error.status
            });
            throw error;
        }
    }

    /**
     * Fetches events fromPostmark
     * @param {Object} postmarkOptions
     * @param {Function} batchHandler
     * @returns {Promise<void>}
     */
    async fetchEvents(postmarkOptions, batchHandler) {
        const postmarkInstance = this.getInstance();
        if (!postmarkInstance) {
            logging.warn(`Postmark is not configured`);
            return;
        }

        logging.info('[Postmark Client] Fetching events for the last 5 minutes...');
        const startDate = new Date(Date.now() - 5 * 60 * 1000);
        const endDate = new Date();

        try {
            let page = await this.getEventsFromPostmark(postmarkInstance, startDate);
            const totalCount = page.TotalCount;
            let currentOffset = 0;

            let events = (page?.Opens?.map(this.normalizeEvent) || []).filter(e => !!e && e.timestamp <= endDate && e.timestamp >= startDate);

            while (totalCount > currentOffset && events.length) {
                await batchHandler(events);
                logging.info('[Postmark Client] Processed ' + events.length + ' events');
                currentOffset += page.Opens.length;

                page = await this.getEventsFromPostmark(postmarkInstance, startDate, currentOffset);

                events = (page?.Opens?.map(this.normalizeEvent) || []).filter(e => !!e && e.timestamp <= endDate && e.timestamp >= startDate);
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
        return {
            id: event.MessageID,
            type: 'opened',
            severity: 'permanent',
            recipientEmail: event.Recipient,
            emailId: event.Tag.split('|')[1] ?? null,
            providerId: event.MessageID,
            timestamp: new Date(event.ReceivedAt),

            error: null
        };
    }

    #getConfig() {
        const bulkEmailConfig = this.#config.get('bulkEmail');
        const bulkEmailSetting = {
            apiToken: this.#settings.get('postmark_api_token'),
            streamId: this.#settings.get('postmark_stream_id') ?? 'broadcast'
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
     * Returns whether the Postmark instance is configured via config/settings
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
        return this.#config.get('bulkEmail')?.batchSize ?? this.constructor.DEFAULT_BATCH_SIZE;
    }

    /**
     * Returns the configured target delivery window in seconds
     * Ghost will attempt to deliver emails evenly distributed over this window
     *
     * Defaults to 0 (no delay) if not set
     *
     * @returns {number}
     */
    getTargetDeliveryWindow() {
        const targetDeliveryWindow = this.#config.get('bulkEmail')?.targetDeliveryWindow;
        // If targetDeliveryWindow is not set or is not a positive integer, return 0
        if (targetDeliveryWindow === undefined || !Number.isInteger(parseInt(targetDeliveryWindow)) || parseInt(targetDeliveryWindow) < 0) {
            return 0;
        }
        return parseInt(targetDeliveryWindow);
    }
};
