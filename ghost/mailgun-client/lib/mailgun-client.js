const _ = require('lodash');
const debug = require('@tryghost/debug');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');

module.exports = class MailgunClient {
    #config;
    #settings;

    static BATCH_SIZE = 1000;

    constructor({config, settings}) {
        this.#config = config;
        this.#settings = settings;
    }

    /**
     * Creates the data payload and sends to Mailgun
     *
     * @param {Object} message
     * @param {Object} recipientData
     * @param {Array<Object>} replacements
     *
     * recipientData format:
     * {
     *     'test@example.com': {
     *         name: 'Test User',
     *         unique_id: '12345abcde',
     *         unsubscribe_url: 'https://example.com/unsub/me'
     *     }
     * }
     */
    async send(message, recipientData, replacements) {
        const mailgunInstance = this.getInstance();
        if (!mailgunInstance) {
            logging.warn(`Mailgun is not configured`);
            return null;
        }

        if (Object.keys(recipientData).length > MailgunClient.BATCH_SIZE) {
            // TODO: what to do here?
        }

        let messageData = {};

        let startTime;
        try {
            const bulkEmailConfig = this.#config.get('bulkEmail');
            const messageContent = _.pick(message, 'subject', 'html', 'plaintext');

            // update content to use Mailgun variable syntax for replacements
            replacements.forEach((replacement) => {
                messageContent[replacement.format] = messageContent[replacement.format].replace(
                    replacement.regexp,
                    `%recipient.${replacement.id}%`
                );
            });

            messageData = {
                to: Object.keys(recipientData),
                from: message.from,
                'h:Reply-To': message.replyTo || message.reply_to,
                subject: messageContent.subject,
                html: messageContent.html,
                text: messageContent.plaintext,
                'recipient-variables': JSON.stringify(recipientData)
            };

            // add a reference to the original email record for easier mapping of mailgun event -> email
            if (message.id) {
                messageData['v:email-id'] = message.id;
            }

            const tags = ['bulk-email'];
            if (bulkEmailConfig?.mailgun?.tag) {
                tags.push(bulkEmailConfig.mailgun.tag);
            }
            messageData['o:tag'] = tags;

            if (bulkEmailConfig?.mailgun?.testmode) {
                messageData['o:testmode'] = true;
            }

            // enable tracking if turned on for this email
            if (message.track_opens) {
                messageData['o:tracking-opens'] = true;
            }

            const mailgunConfig = this.#getConfig();
            startTime = Date.now();
            const response = await mailgunInstance.messages.create(mailgunConfig.domain, messageData);
            metrics.metric('mailgun-send-mail', {
                value: Date.now() - startTime,
                statusCode: 200
            });

            return {
                id: response.id
            };
        } catch (error) {
            logging.error(error);
            metrics.metric('mailgun-send-mail', {
                value: Date.now() - startTime,
                statusCode: error.status
            });
            return Promise.reject({error, messageData});
        }
    }

    async fetchEvents(mailgunOptions, batchHandler, {maxEvents = Infinity} = {}) {
        let result = [];

        const mailgunInstance = this.getInstance();
        if (!mailgunInstance) {
            logging.warn(`Mailgun is not configured`);
            return result;
        }

        debug(`fetchEvents: starting fetching first events page`);
        const mailgunConfig = this.#getConfig();
        let startTime = Date.now();
        try {
            let page = await mailgunInstance.events.get(mailgunConfig.domain, mailgunOptions);
            metrics.metric('mailgun-get-events', {
                value: Date.now() - startTime,
                statusCode: 200
            });
            let events = page?.items?.map(this.normalizeEvent) || [];
            debug(`fetchEvents: finished fetching first page with ${events.length} events`);

            let eventCount = 0;

            pagesLoop:
            while (events.length !== 0) {
                const batchResult = await batchHandler(events);

                result = result.concat(batchResult);
                eventCount += events.length;

                if (eventCount >= maxEvents) {
                    break pagesLoop;
                }

                const nextPageId = page.pages.next.page;
                debug(`fetchEvents: starting fetching next page ${nextPageId}`);
                startTime = Date.now();
                page = await mailgunInstance.events.get(mailgunConfig.domain, {
                    page: nextPageId,
                    ...mailgunOptions
                });
                metrics.metric('mailgun-get-events', {
                    value: Date.now() - startTime,
                    statusCode: 200
                });
                events = page?.items?.map(this.normalizeEvent) || [];
                debug(`fetchEvents: finished fetching next page with ${events.length} events`);
            }

            return result;
        } catch (error) {
            // Log and re-throw Mailgun errors
            logging.error(error);
            metrics.metric('mailgun-get-events', {
                value: Date.now() - startTime,
                statusCode: error.status
            });
            throw error;
        }
    }

    async removeSuppression(type, email) {
        if (!this.isConfigured()) {
            return false;
        }
        const instance = this.getInstance();
        const config = this.#getConfig();

        try {
            await instance.suppressions.destroy(
                config.domain,
                type,
                email
            );
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
            apiKey: this.#settings.get('mailgun_api_key'),
            domain: this.#settings.get('mailgun_domain'),
            baseUrl: this.#settings.get('mailgun_base_url')
        };

        const hasMailgunConfig = !!(bulkEmailConfig?.mailgun);
        const hasMailgunSetting = !!(bulkEmailSetting && bulkEmailSetting.apiKey && bulkEmailSetting.baseUrl && bulkEmailSetting.domain);

        if (!hasMailgunConfig && !hasMailgunSetting) {
            return null;
        }

        const mailgunConfig = hasMailgunConfig ? bulkEmailConfig.mailgun : bulkEmailSetting;
        return mailgunConfig;
    }

    /**
     * Returns an instance of the Mailgun client based upon the config or settings values
     *
     * We don't cache the instance so we can always get a fresh one based upon changed settings
     * or config values over time
     *
     * Note: if the credentials are not configure, this method returns `null` and it is down to the
     * consumer to act upon this/log this out
     *
     * @returns {import('mailgun.js')} the Mailgun client instance
     */
    getInstance() {
        const mailgunConfig = this.#getConfig();
        if (!mailgunConfig) {
            return null;
        }

        const formData = require('form-data');
        const Mailgun = require('mailgun.js');

        const baseUrl = new URL(mailgunConfig.baseUrl);
        const mailgun = new Mailgun(formData);

        return mailgun.client({
            username: 'api',
            key: mailgunConfig.apiKey,
            url: baseUrl.origin,
            timeout: 60000
        });
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
};
